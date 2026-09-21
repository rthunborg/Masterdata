using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace HrMasterdata.Release
{
    // Compiled together with a reviewed, installation-specific Installation
    // class. No path, hash, command or target can be supplied at runtime.
    // Current owner, Administrators, SYSTEM and the Windows runtime are trusted.
    internal static class ProtectedBootstrapHost
    {
        [StructLayout(LayoutKind.Sequential)]
        struct BasicLimits
        {
            public long ProcessTime, JobTime;
            public uint Flags;
            public UIntPtr MinWorkingSet, MaxWorkingSet;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass, SchedulingClass;
        }
        [StructLayout(LayoutKind.Sequential)]
        struct IoCounters { public ulong A, B, C, D, E, F; }
        [StructLayout(LayoutKind.Sequential)]
        struct JobLimits
        {
            public BasicLimits Basic;
            public IoCounters Io;
            public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
        }
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        static extern IntPtr CreateJobObject(IntPtr security, string name);
        [DllImport("kernel32.dll")]
        static extern bool SetInformationJobObject(IntPtr job, int kind, ref JobLimits limits, uint length);
        [DllImport("kernel32.dll")]
        static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr handle);

        static void Require(bool value) { if (!value) throw new InvalidOperationException("Protected bootstrap refused"); }

        static void VerifyDirectory(string directory, HashSet<string> directories, Dictionary<string, string> files)
        {
            foreach (string entry in Directory.GetFileSystemEntries(directory))
            {
                var attributes = File.GetAttributes(entry);
                Require((attributes & FileAttributes.ReparsePoint) == 0);
                if ((attributes & FileAttributes.Directory) != 0)
                {
                    Require(directories.Contains(entry));
                    VerifyDirectory(entry, directories, files);
                }
                else Require(files.ContainsKey(entry));
            }
        }

        internal static int Main(string[] args)
        {
            Process child = null;
            IntPtr job = IntPtr.Zero;
            ProtectedFileLease lease = null;
            int stage = 0;
            try
            {
                Require(args.Length == 0);
                string root = Installation.Root;
                string self = Path.Combine(root, "bootstrap.exe");
                Require(String.Equals(Assembly.GetExecutingAssembly().Location, self, StringComparison.OrdinalIgnoreCase));
                var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var item in Installation.Files)
                {
                    Require(!Path.IsPathRooted(item.Key) && item.Key.IndexOf("..", StringComparison.Ordinal) < 0);
                    files.Add(Path.Combine(root, item.Key), item.Value);
                }
                // The image is already mapped; the trusted installer establishes
                // its identity. Holding its file prevents rename during this run.
                using (var sha = System.Security.Cryptography.SHA256.Create())
                using (var stream = File.OpenRead(self))
                    files.Add(self, BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant());
                stage = 1; lease = ProtectedFileLease.Acquire(root, files);
                var directories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (string file in files.Keys)
                {
                    string directory = Path.GetDirectoryName(file);
                    while (directory != null && directory.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase))
                    {
                        directories.Add(directory);
                        directory = Path.GetDirectoryName(directory);
                    }
                }
                VerifyDirectory(root, directories, files);

                stage = 2; job = CreateJobObject(IntPtr.Zero, null);
                Require(job != IntPtr.Zero);
                var limits = new JobLimits();
                // The worker cannot spawn the CLI until the pipe is sent after
                // job assignment. Kill that bounded subtree on completion.
                limits.Basic.Flags = 0x2000; // KILL_ON_JOB_CLOSE
                Require(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(JobLimits))));
                var start = new ProcessStartInfo();
                start.FileName = Path.Combine(root, "runtime", "node.exe");
                start.Arguments = "--no-addons --no-global-search-paths \"" + Path.Combine(root, "src", "lib", "release", "protected-bootstrap-worker.mjs") + "\"";
                start.WorkingDirectory = root;
                start.UseShellExecute = false;
                start.CreateNoWindow = true;
                start.RedirectStandardInput = start.RedirectStandardOutput = start.RedirectStandardError = true;
                start.EnvironmentVariables.Clear();
                string windows = Directory.GetParent(Environment.SystemDirectory).FullName;
                start.EnvironmentVariables["SystemRoot"] = windows;
                start.EnvironmentVariables["WINDIR"] = windows;
                start.EnvironmentVariables["PATH"] = Environment.SystemDirectory;
                start.EnvironmentVariables["SUPABASE_CLI_EXECUTABLE"] = Path.Combine(root, "runtime", "supabase.exe");
                start.EnvironmentVariables["EXPECTED_SUPABASE_CLI_SHA256"] = files[Path.Combine(root, "runtime", "supabase.exe")];
                stage = 3; child = Process.Start(start);
                Require(child != null);
                // The leased worker waits for its pipe before importing the
                // wrapper or spawning the CLI, closing the assignment race.
                Require(AssignProcessToJobObject(job, child.Handle));
                stage = 4; var ready = child.StandardOutput.ReadLineAsync();
                Require(ready.Wait(10000));
                Match match = Regex.Match(ready.Result ?? "", "\\A\\{\"kind\":\"protected-toolchain-ready\",\"nonce\":\"([a-f0-9]{64})\"\\}\\z");
                Require(match.Success);
                // Loaded native images must be this leased runtime or the OS.
                stage = 5; foreach (ProcessModule module in child.Modules)
                    Require(files.ContainsKey(module.FileName) || module.FileName.StartsWith(Environment.SystemDirectory + "\\", StringComparison.OrdinalIgnoreCase));
                stage = 6; child.StandardInput.Write("{\"schemaVersion\":1,\"operation\":\"verify-toolchain\",\"nonce\":\"" + match.Groups[1].Value + "\"}");
                child.StandardInput.Close();
                var output = child.StandardOutput.ReadToEndAsync();
                var errors = child.StandardError.ReadToEndAsync();
                Require(child.WaitForExit(30000) && output.Wait(1000) && errors.Wait(1000));
                stage = 7; Require(child.ExitCode == 0 && output.Result.Trim() == "2.115.0" && errors.Result.Length == 0);
                Console.WriteLine("{\"verifiedToolchain\":true,\"hostedAccess\":false,\"privateInputsLoaded\":false}");
                return 0;
            }
            catch
            {
                Console.Error.WriteLine("Protected bootstrap refused at stage " + stage + "; no database operation is available.");
                return 1;
            }
            finally
            {
                // Closing the job terminates this child and its descendants,
                // including a timed-out CLI, before releasing the file lease.
                if (job != IntPtr.Zero) CloseHandle(job);
                if (child != null)
                {
                    try { if (!child.HasExited) { child.Kill(); child.WaitForExit(5000); } } catch { }
                    child.Dispose();
                }
                if (lease != null) lease.Dispose();
            }
        }
    }
}
