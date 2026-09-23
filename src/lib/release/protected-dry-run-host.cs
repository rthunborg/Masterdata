using System;
using System.Collections.Generic;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Text;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Security.Cryptography;
using System.Web.Script.Serialization;

namespace HrMasterdata.Release
{
    // Compiled together with a reviewed, installation-specific Installation
    // class. No path, hash, command or target can be supplied at runtime.
    // Current owner, Administrators, SYSTEM and the Windows runtime are trusted.
    internal static class ProtectedDryRunHost
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

        static string Hash(string file)
        {
            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(file))
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
        }

        static void CheckInventory(string root, Dictionary<string, string> files)
        {
            var dirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (string file in files.Keys)
            {
                string directory = Path.GetDirectoryName(file);
                while (directory != null && directory.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase))
                { dirs.Add(directory); directory = Path.GetDirectoryName(directory); }
            }
            VerifyDirectory(root, dirs, files);
        }

        static DirectorySecurity RestrictedDirectoryAcl()
        {
            var owner = WindowsIdentity.GetCurrent().User;
            var acl = new DirectorySecurity();
            acl.SetOwner(owner); acl.SetAccessRuleProtection(true, false);
            foreach (string sid in new[] { owner.Value, "S-1-5-18", "S-1-5-32-544" })
                acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid), FileSystemRights.FullControl,
                    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
            return acl;
        }

        static string RedactedReceipt(string output, string root, JavaScriptSerializer serializer)
        {
            var result = serializer.Deserialize<Dictionary<string, object>>(output);
            string[] keys = { "schemaVersion", "kind", "sourceCommit", "sourceTree", "sourceManifestSha256", "packageSha256", "outputSha256", "versions", "planningOnly", "authorizesApply", "authorizesRepair", "authorizesCleanup" };
            Require(result != null && result.Count == keys.Length);
            foreach (string key in keys) Require(result.ContainsKey(key));
            Require(result["schemaVersion"] is int && (int)result["schemaVersion"] == 1 && (string)result["kind"] == "protected-production-dry-run");
            foreach (string key in new[] { "sourceCommit", "sourceTree", "sourceManifestSha256", "packageSha256", "outputSha256" })
                Require(result[key] is string && Regex.IsMatch((string)result[key], key == "sourceCommit" || key == "sourceTree" ? "\\A[a-f0-9]{40}\\z" : "\\A[a-f0-9]{64}\\z"));
            Require(result["planningOnly"] is bool && (bool)result["planningOnly"]);
            foreach (string key in new[] { "authorizesApply", "authorizesRepair", "authorizesCleanup" }) Require(result[key] is bool && !(bool)result[key]);
            var package = serializer.Deserialize<Dictionary<string, object>>(File.ReadAllText(Path.Combine(root, "toolchain-package.json")));
            foreach (string key in new[] { "sourceCommit", "sourceTree", "sourceManifestSha256" }) Require((string)result[key] == (string)package[key]);
            Require((string)result["packageSha256"] == Hash(Path.Combine(root, "toolchain-package.json")));
            var versions = result["versions"] as IEnumerable; Require(versions != null && !(versions is string));
            string[] expected = { "20260314000001", "20260314000002", "20260614000000", "20260615000000", "20260709194903", "20260710144000", "20260710150000", "20260831200026", "20260909115242", "20260910094517", "20260910115024", "20260910184840", "20260910184841" };
            int index = 0;
            foreach (object value in versions) { Require(index < expected.Length && value is string && (string)value == expected[index]); index++; }
            Require(index == expected.Length);
            // Re-serialize only validated fixed fields; never relay child text.
            return serializer.Serialize(result);
        }

        internal static int Main(string[] args)
        {
            Process child = null;
            IntPtr job = IntPtr.Zero;
            ProtectedFileLease installationLease = null, linkLease = null, workLease = null;
            ProductionInputs inputs = null;
            try
            {
                Require(args.Length == 0);
                string root = Installation.Root;
                string self = Path.Combine(root, "dry-run.exe");
                Require(String.Equals(Assembly.GetExecutingAssembly().Location, self, StringComparison.OrdinalIgnoreCase));
                var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var item in Installation.Files)
                    files.Add(Path.Combine(root, item.Key), item.Value);
                files.Add(self, Hash(self));
                installationLease = ProtectedFileLease.Acquire(root, files);
                CheckInventory(root, files);
                string windows = Directory.GetParent(Environment.SystemDirectory).FullName;
                using (var current = Process.GetCurrentProcess())
                    foreach (ProcessModule module in current.Modules)
                        Require(files.ContainsKey(module.FileName) ||
                            module.FileName.StartsWith(Environment.SystemDirectory + "\\", StringComparison.OrdinalIgnoreCase) ||
                            module.FileName.StartsWith(Path.Combine(windows, "Microsoft.NET") + "\\", StringComparison.OrdinalIgnoreCase) ||
                            module.FileName.StartsWith(Path.Combine(windows, "assembly") + "\\", StringComparison.OrdinalIgnoreCase));

                job = CreateJobObject(IntPtr.Zero, null);
                Require(job != IntPtr.Zero);
                var limits = new JobLimits(); limits.Basic.Flags = 0x2000;
                Require(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(JobLimits))));
                var start = new ProcessStartInfo();
                start.FileName = Path.Combine(root, "runtime", "node.exe");
                start.Arguments = "--no-addons --no-global-search-paths \"" + Path.Combine(root, "src", "lib", "release", "protected-dry-run-worker.mjs") + "\"";
                start.WorkingDirectory = root; start.UseShellExecute = false; start.CreateNoWindow = true;
                start.RedirectStandardInput = start.RedirectStandardOutput = start.RedirectStandardError = true;
                start.EnvironmentVariables.Clear();
                start.EnvironmentVariables["SystemRoot"] = windows;
                start.EnvironmentVariables["WINDIR"] = windows;
                start.EnvironmentVariables["PATH"] = Environment.SystemDirectory;
                child = Process.Start(start);
                Require(child != null && AssignProcessToJobObject(job, child.Handle));
                var ready = child.StandardOutput.ReadLineAsync(); Require(ready.Wait(10000));
                Match match = Regex.Match(ready.Result ?? "", "\\A\\{\"kind\":\"protected-dry-run-ready\",\"nonce\":\"([a-f0-9]{64})\"\\}\\z");
                Require(match.Success);
                foreach (ProcessModule module in child.Modules)
                    Require(files.ContainsKey(module.FileName) || module.FileName.StartsWith(Environment.SystemDirectory + "\\", StringComparison.OrdinalIgnoreCase));

                // Only the fixed, verified host loads private inputs, after the
                // complete installed closure, job containment and module check.
                inputs = ProductionInputs.Load(Installation.InputRoot);
                var linkFiles = new Dictionary<string, string> { { Installation.LinkPath, Installation.LinkSha256 } };
                linkLease = ProtectedFileLease.Acquire(Path.GetDirectoryName(Installation.LinkPath), linkFiles);
                string reference = File.ReadAllText(Installation.LinkPath).Trim();
                Require(Regex.IsMatch(reference, "\\A[a-z0-9]{20}\\z") && reference == inputs.EnvironmentValues["EXPECTED_SUPABASE_PROJECT_REF"]);

                // Separate fresh restricted work root, never the source checkout
                // or installation. Retain it privately for failure diagnosis.
                string work = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".hr-masterdata-dryrun-" + Guid.NewGuid().ToString("N"));
                Require(!Directory.Exists(work));
                Directory.CreateDirectory(work, RestrictedDirectoryAcl());
                var workFiles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var item in Installation.Files)
                {
                    if (!item.Key.StartsWith("supabase\\migrations\\", StringComparison.Ordinal) && item.Key != "supabase\\migration-baseline-manifest.json") continue;
                    string target = Path.Combine(work, item.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(target));
                    File.Copy(Path.Combine(root, item.Key), target, false); workFiles.Add(target, item.Value);
                }
                Require(workFiles.Count == 14);
                string link = Path.Combine(work, "supabase", ".temp", "project-ref");
                Directory.CreateDirectory(Path.GetDirectoryName(link));
                using (var stream = new FileStream(link, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                { byte[] bytes = Encoding.UTF8.GetBytes(reference); stream.Write(bytes, 0, bytes.Length); }
                workFiles.Add(link, Hash(link));
                workLease = ProtectedFileLease.Acquire(work, workFiles); CheckInventory(work, workFiles);
                var environment = new Dictionary<string, string>(inputs.EnvironmentValues);
                environment.Add("SystemRoot", windows); environment.Add("WINDIR", windows); environment.Add("PATH", Environment.SystemDirectory);
                environment.Add("SUPABASE_CLI_EXECUTABLE", Path.Combine(root, "runtime", "supabase.exe"));
                environment.Add("EXPECTED_SUPABASE_CLI_SHA256", files[Path.Combine(root, "runtime", "supabase.exe")]);
                var serializer = new JavaScriptSerializer { MaxJsonLength = 65536 };
                byte[] payload = Encoding.UTF8.GetBytes(serializer.Serialize(new { schemaVersion = 1, operation = "production-dry-run", nonce = match.Groups[1].Value, workspace = work, environment = environment }));
                byte[] signature;
                using (var rsa = new RSACryptoServiceProvider())
                { rsa.PersistKeyInCsp = false; rsa.FromXmlString(Installation.OriginPrivateKey); signature = rsa.SignData(payload, CryptoConfig.MapNameToOID("SHA256")); }
                child.StandardInput.Write(serializer.Serialize(new { payload = Convert.ToBase64String(payload), signature = Convert.ToBase64String(signature) }));
                child.StandardInput.Close(); Array.Clear(payload, 0, payload.Length);
                var output = child.StandardOutput.ReadToEndAsync(); var errors = child.StandardError.ReadToEndAsync();
                Require(child.WaitForExit(90000) && output.Wait(1000) && errors.Wait(1000));
                Require(child.ExitCode == 0 && errors.Result.Length == 0 && output.Result.Length < 4096);
                Console.WriteLine(RedactedReceipt(output.Result, root, serializer)); return 0;
            }
            catch
            { Console.Error.WriteLine("Protected production dry run refused; no apply, repair or cleanup command is available."); return 1; }
            finally
            {
                if (job != IntPtr.Zero) CloseHandle(job);
                if (child != null)
                { try { if (!child.HasExited) { child.Kill(); child.WaitForExit(5000); } } catch { } child.Dispose(); }
                if (workLease != null) workLease.Dispose();
                if (linkLease != null) linkLease.Dispose();
                if (inputs != null) inputs.Dispose();
                if (installationLease != null) installationLease.Dispose();
            }
        }
    }
}
