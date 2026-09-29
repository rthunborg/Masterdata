using System;
using System.Collections.Generic;
using System.Globalization;
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
    internal static class ProtectedProductionCutoverHost
    {
        // The worker's ready/input protocol is each bounded at 10 seconds. Each
        // of its two fixed CLI attempts can spend 10 seconds on --version and
        // 90 seconds in the CLI. The 60-second headroom covers the host's
        // leased evidence and input checks, worker prerequisite rechecks,
        // target/TLS checks, journal setup and startup work. Therefore:
        // 10 + 10 + 2 * (10 + 90) + 2 + 60 = 282 seconds. The six-minute
        // outer deadline leaves 78 seconds of additional margin without
        // weakening either per-attempt timeout or the fail-closed no-retry rule.
        const int WorkerReadyTimeoutMilliseconds = 10000;
        const int WorkerInputTimeoutMilliseconds = 10000;
        const int ReviewedCliVersionTimeoutMilliseconds = 10000;
        const int ReviewedCliInvocationTimeoutMilliseconds = 90000;
        const int ProtectedCliAttemptCount = 2;
        const int TerminalStreamDrainTimeoutMilliseconds = 1000;
        const int PreflightAndJournalHeadroomMilliseconds = 60000;
        const int OuterWorkerDeadlineMilliseconds = 360000;
        const int BoundedTerminationTimeoutMilliseconds = 5000;

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

        // A cleanup interval is read only from the evidence file that is already
        // protected by the host's hash-pinned lease; it is never an installer or
        // command-line argument.
        static string RequireCanonicalUtc(object value, out DateTime parsed)
        {
            string text = value as string;
            Require(text != null && Regex.IsMatch(text, "\\A\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z\\z"));
            Require(DateTime.TryParseExact(text, "yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out parsed));
            Require(parsed.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture) == text);
            return text;
        }

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

        // Retain recovery material only under the current Windows user's DPAPI
        // protection. Exact CLI streams stay encrypted in the private work root;
        // they never become console output or a plaintext recovery log.
        static string PreserveDiagnosticRecoveryKey(string work)
        {
            byte[] plaintext = null, entropy = null, protectedKey = null;
            try
            {
                plaintext = Encoding.UTF8.GetBytes(Installation.OriginPrivateKey);
                entropy = Encoding.UTF8.GetBytes("hr-masterdata/production/cutover-diagnostics/v1");
                protectedKey = ProtectedData.Protect(plaintext, entropy, DataProtectionScope.CurrentUser);
                string file = Path.Combine(work, "diagnostic-recovery-key.v1.dpapi");
                using (var stream = new FileStream(file, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                { stream.Write(protectedKey, 0, protectedKey.Length); stream.Flush(true); }
                return file;
            }
            finally
            {
                if (plaintext != null) Array.Clear(plaintext, 0, plaintext.Length);
                if (entropy != null) Array.Clear(entropy, 0, entropy.Length);
                if (protectedKey != null) Array.Clear(protectedKey, 0, protectedKey.Length);
            }
        }

        static string RedactedReceipt(string output, string root, JavaScriptSerializer serializer)
        {
            var result = serializer.Deserialize<Dictionary<string, object>>(output);
            string[] keys = { "schemaVersion", "kind", "sourceCommit", "sourceTree", "sourceManifestSha256", "targetBindingSha256", "versions", "authorizesCleanup", "authorizesRepair", "authorizesMain", "authorizesDeployment", "authorizesReopen" };
            Require(result != null && result.Count == keys.Length);
            foreach (string key in keys) Require(result.ContainsKey(key));
            Require(result["schemaVersion"] is int && (int)result["schemaVersion"] == 1 && (string)result["kind"] == "protected-production-forward-13-attempt");
            foreach (string key in new[] { "sourceCommit", "sourceTree", "sourceManifestSha256", "targetBindingSha256" })
                Require(result[key] is string && Regex.IsMatch((string)result[key], key == "sourceCommit" || key == "sourceTree" ? "\\A[a-f0-9]{40}\\z" : "\\A[a-f0-9]{64}\\z"));
            foreach (string key in new[] { "authorizesCleanup", "authorizesRepair", "authorizesMain", "authorizesDeployment", "authorizesReopen" }) Require(result[key] is bool && !(bool)result[key]);
            var package = serializer.Deserialize<Dictionary<string, object>>(File.ReadAllText(Path.Combine(root, "toolchain-package.json")));
            foreach (string key in new[] { "sourceCommit", "sourceTree", "sourceManifestSha256" }) Require((string)result[key] == (string)package[key]);
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
            ProtectedFileLease installationLease = null, linkLease = null, evidenceLease = null, workLease = null;
            ProductionInputs inputs = null;
            try
            {
                Require(args.Length == 0);
                string root = Installation.Root;
                string self = Path.Combine(root, "production-cutover.exe");
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
                start.Arguments = "--no-addons --no-global-search-paths \"" + Path.Combine(root, "src", "lib", "release", "protected-production-cutover-worker.mjs") + "\"";
                start.WorkingDirectory = root; start.UseShellExecute = false; start.CreateNoWindow = true;
                start.RedirectStandardInput = start.RedirectStandardOutput = start.RedirectStandardError = true;
                start.EnvironmentVariables.Clear();
                start.EnvironmentVariables["SystemRoot"] = windows;
                start.EnvironmentVariables["WINDIR"] = windows;
                start.EnvironmentVariables["PATH"] = Environment.SystemDirectory;
                child = Process.Start(start);
                Require(child != null && AssignProcessToJobObject(job, child.Handle));
                var ready = child.StandardOutput.ReadLineAsync(); Require(ready.Wait(WorkerReadyTimeoutMilliseconds));
                Match match = Regex.Match(ready.Result ?? "", "\\A\\{\"kind\":\"protected-production-cutover-ready\",\"nonce\":\"([a-f0-9]{64})\"\\}\\z");
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
                var evidenceFiles = new Dictionary<string, string> {
                    { Installation.StaffingReceiptPath, Installation.StaffingReceiptSha256 },
                    { Installation.IsolationReceiptPath, Installation.IsolationReceiptSha256 },
                    { Installation.PreForwardReceiptPath, Installation.PreForwardReceiptSha256 },
                    { Installation.BackupRecordPath, Installation.BackupRecordSha256 },
                    { Installation.CleanupRecordPath, Installation.CleanupRecordSha256 }
                };
                evidenceLease = ProtectedFileLease.Acquire(Installation.EvidenceRoot, evidenceFiles);
                string staffingReceipt = File.ReadAllText(Installation.StaffingReceiptPath);
                string isolationReceipt = File.ReadAllText(Installation.IsolationReceiptPath);
                string preForwardReceipt = File.ReadAllText(Installation.PreForwardReceiptPath);
                string cleanupRecord = File.ReadAllText(Installation.CleanupRecordPath);
                Require(Hash(Installation.StaffingReceiptPath) == Installation.StaffingReceiptSha256 && Hash(Installation.IsolationReceiptPath) == Installation.IsolationReceiptSha256);
                Require(Hash(Installation.PreForwardReceiptPath) == Installation.PreForwardReceiptSha256 &&
                    Hash(Installation.BackupRecordPath) == Installation.BackupRecordSha256 &&
                    Hash(Installation.CleanupRecordPath) == Installation.CleanupRecordSha256);
                string actualTargetBinding;
                using (var sha = SHA256.Create())
                    actualTargetBinding = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(
                        "hr-masterdata:production-target:v1:" + reference))).Replace("-", "").ToLowerInvariant();
                Require(actualTargetBinding == Installation.TargetBindingSha256);

                // Separate fresh restricted work root, never the source checkout
                // or installation. Retain it privately for failure diagnosis.
                string work = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".hr-masterdata-cutover-" + Guid.NewGuid().ToString("N"));
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
                string recoveryKey = PreserveDiagnosticRecoveryKey(work);
                workFiles.Add(recoveryKey, Hash(recoveryKey));
                workLease = ProtectedFileLease.Acquire(work, workFiles); CheckInventory(work, workFiles);
                var environment = new Dictionary<string, string>(inputs.EnvironmentValues);
                environment.Add("SystemRoot", windows); environment.Add("WINDIR", windows); environment.Add("PATH", Environment.SystemDirectory);
                environment.Add("SUPABASE_CLI_EXECUTABLE", Path.Combine(root, "runtime", "supabase.exe"));
                environment.Add("EXPECTED_SUPABASE_CLI_SHA256", files[Path.Combine(root, "runtime", "supabase.exe")]);
                var serializer = new JavaScriptSerializer { MaxJsonLength = 65536 };
                var package = serializer.Deserialize<Dictionary<string, object>>(File.ReadAllText(Path.Combine(root, "toolchain-package.json")));
                Require(package != null && package.ContainsKey("sourceCommit") && package.ContainsKey("sourceTree") && package.ContainsKey("sourceManifestSha256"));
                var isolationEvidence = serializer.Deserialize<Dictionary<string, object>>(isolationReceipt);
                Require(isolationEvidence != null && isolationEvidence.Count == 2 && isolationEvidence.ContainsKey("receipts") && isolationEvidence.ContainsKey("context"));
                var cleanupEvidence = serializer.Deserialize<Dictionary<string, object>>(cleanupRecord);
                Require(cleanupEvidence != null && cleanupEvidence.ContainsKey("startedAtUtc") && cleanupEvidence.ContainsKey("completedAtUtc"));
                DateTime cleanupStartedAt, cleanupCompletedAt;
                // Both timestamps come only from the already hash-leased cleanup
                // record. No installer or caller value can override this interval.
                string cleanupStartedAtUtc = RequireCanonicalUtc(cleanupEvidence["startedAtUtc"], out cleanupStartedAt);
                string cleanupCompletedAtUtc = RequireCanonicalUtc(cleanupEvidence["completedAtUtc"], out cleanupCompletedAt);
                Require(cleanupStartedAt <= cleanupCompletedAt);
                byte[] payload = Encoding.UTF8.GetBytes(serializer.Serialize(new { schemaVersion = 1, operation = "apply-forward-13", nonce = match.Groups[1].Value, workspace = work, environment = environment, sourceSha = package["sourceCommit"], sourceTree = package["sourceTree"], sourceManifestSha256 = package["sourceManifestSha256"], targetBindingSha256 = actualTargetBinding, staffingReceipt = serializer.DeserializeObject(staffingReceipt), isolationReceipts = isolationEvidence["receipts"], isolationContext = isolationEvidence["context"], preForwardObservation = serializer.DeserializeObject(preForwardReceipt), reviewRecords = new { backupRecordSha256 = Installation.BackupRecordSha256, cleanupRecordSha256 = Installation.CleanupRecordSha256, cleanupStartedAtUtc = cleanupStartedAtUtc, cleanupCompletedAtUtc = cleanupCompletedAtUtc } }));
                byte[] signature;
                using (var rsa = new RSACryptoServiceProvider())
                { rsa.PersistKeyInCsp = false; rsa.FromXmlString(Installation.OriginPrivateKey); signature = rsa.SignData(payload, CryptoConfig.MapNameToOID("SHA256")); }
                child.StandardInput.Write(serializer.Serialize(new { payload = Convert.ToBase64String(payload), signature = Convert.ToBase64String(signature) }));
                child.StandardInput.Close(); Array.Clear(payload, 0, payload.Length);
                var output = child.StandardOutput.ReadToEndAsync(); var errors = child.StandardError.ReadToEndAsync();
                Require(child.WaitForExit(OuterWorkerDeadlineMilliseconds) && output.Wait(TerminalStreamDrainTimeoutMilliseconds) && errors.Wait(TerminalStreamDrainTimeoutMilliseconds));
                Require(child.ExitCode == 0 && errors.Result.Length == 0 && output.Result.Length < 4096);
                Console.WriteLine(RedactedReceipt(output.Result, root, serializer)); return 0;
            }
            catch
            { Console.Error.WriteLine("Protected production cutover did not complete. Database outcome requires immediate read-only diagnosis; do not retry or repair automatically. Production remains paused."); return 1; }
            finally
            {
                if (job != IntPtr.Zero) CloseHandle(job);
                if (child != null)
                { try { if (!child.HasExited) { child.Kill(); child.WaitForExit(BoundedTerminationTimeoutMilliseconds); } } catch { } child.Dispose(); }
                if (workLease != null) workLease.Dispose();
                if (evidenceLease != null) evidenceLease.Dispose();
                if (linkLease != null) linkLease.Dispose();
                if (inputs != null) inputs.Dispose();
                if (installationLease != null) installationLease.Dispose();
            }
        }
    }
}
