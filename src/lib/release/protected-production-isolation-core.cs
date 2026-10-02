using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Globalization;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace HrMasterdata.Release
{
    // The public host delegates here so the generated Installation contract is
    // compact and auditable.  It contains no public target, endpoint, command,
    // source, credential, callback, or timeout selector.
    internal static class ProtectedProductionIsolationCore
    {
        const int ReadyTimeoutMilliseconds = 10000;
        const int HostDeadlineMilliseconds = 600000;
        const int DrainTimeoutMilliseconds = 10000;
        const int MaximumBytes = 65536;
        const int MaximumFiles = 512;

        [StructLayout(LayoutKind.Sequential)] struct BasicLimits { public long ProcessTime, JobTime; public uint Flags; public UIntPtr MinimumWorkingSet, MaximumWorkingSet; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
        [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong A, B, C, D, E, F; }
        [StructLayout(LayoutKind.Sequential)] struct JobLimits { public BasicLimits Basic; public IoCounters Io; public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory; }
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
        [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job, int informationClass, ref JobLimits limits, uint length);
        [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
        [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);

        static IntPtr activeIsolationJob = IntPtr.Zero;
        internal static void ContainSealProcess(Process process)
        {
            Require(process != null && activeIsolationJob != IntPtr.Zero &&
                AssignProcessToJobObject(activeIsolationJob, process.Handle));
        }

        static readonly Regex Sha256 = new Regex("\\A[a-f0-9]{64}\\z", RegexOptions.CultureInvariant);
        static readonly Regex Sha40 = new Regex("\\A[a-f0-9]{40}\\z", RegexOptions.CultureInvariant);
        static readonly Regex Nonce = new Regex("\\A[a-f0-9]{64}\\z", RegexOptions.CultureInvariant);
        static readonly Regex Correlation = new Regex("\\A[a-f0-9]{32}\\z", RegexOptions.CultureInvariant);
        static void Require(bool condition) { if (!condition) throw new InvalidOperationException("Protected production isolation refused"); }
        static void RequireHash(string value) { Require(Sha256.IsMatch(value ?? "")); }
        static void RequireSha40(string value) { Require(Sha40.IsMatch(value ?? "")); }

        static string Hash(string path)
        {
            using (var sha = SHA256.Create()) using (var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
        }

        static bool Exact(IDictionary<string, object> value, params string[] keys)
        {
            if (value == null || value.Count != keys.Length) return false;
            foreach (string key in keys) if (!value.ContainsKey(key)) return false;
            return true;
        }

        static Dictionary<string, object> ObjectMap(JavaScriptSerializer json, object value)
        {
            Require(value != null); string text = json.Serialize(value); Require(Encoding.UTF8.GetByteCount(text) <= MaximumBytes);
            return json.Deserialize<Dictionary<string, object>>(text);
        }

        static string StringValue(IDictionary<string, object> value, string key)
        {
            object raw; Require(value.TryGetValue(key, out raw)); string text = raw as string;
            Require(text != null && text.IndexOf('\0') < 0); return text;
        }

        static Dictionary<string, string> ClosedAbsoluteFiles(string root, IDictionary<string, string> files)
        {
            Require(files != null && files.Count > 0 && files.Count <= MaximumFiles);
            string canonicalRoot = Path.GetFullPath(root).TrimEnd('\\') + "\\";
            var absolute = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in files)
            {
                Require(!Path.IsPathRooted(item.Key) && item.Key.IndexOf(':') < 0 && item.Key.IndexOf("..", StringComparison.Ordinal) < 0);
                string full = Path.GetFullPath(Path.Combine(root, item.Key));
                Require(full.StartsWith(canonicalRoot, StringComparison.OrdinalIgnoreCase)); RequireHash(item.Value);
                Require(!absolute.ContainsKey(full) && Hash(full) == item.Value); absolute.Add(full, item.Value);
            }
            return absolute;
        }

        static ProtectedFileLease AcquireClosedLease(string root, IDictionary<string, string> relativeFiles)
        {
            var absolute = ClosedAbsoluteFiles(root, relativeFiles);
            return ProtectedFileLease.Acquire(root, absolute);
        }

        static void RequireLeasedFile(string root, IDictionary<string, string> relativeFiles, string file, string expectedHash)
        {
            Require(!String.IsNullOrWhiteSpace(file) && Path.IsPathRooted(file)); RequireHash(expectedHash);
            var absolute = ClosedAbsoluteFiles(root, relativeFiles);
            string canonical = Path.GetFullPath(file); string admitted;
            Require(absolute.TryGetValue(canonical, out admitted) && admitted == expectedHash && Hash(canonical) == expectedHash);
        }

        static void RequireLeasedInventoryFile(string root, IDictionary<string, string> relativeFiles, string file)
        {
            Require(!String.IsNullOrWhiteSpace(file) && Path.IsPathRooted(file));
            var absolute = ClosedAbsoluteFiles(root, relativeFiles); string admitted;
            string canonical = Path.GetFullPath(file);
            Require(absolute.TryGetValue(canonical, out admitted) && Hash(canonical) == admitted);
        }

        static void RequireLeasedTool(string file, string expectedHash)
        {
            Require(Installation.ToolGroups != null);
            foreach (var group in Installation.ToolGroups)
            {
                if (group == null || String.IsNullOrWhiteSpace(group.Root) || group.Files == null) continue;
                var absolute = ClosedAbsoluteFiles(group.Root, group.Files); string canonical = Path.GetFullPath(file); string admitted;
                if (absolute.TryGetValue(canonical, out admitted))
                {
                    Require(admitted == expectedHash && Hash(canonical) == expectedHash); return;
                }
            }
            Require(false);
        }

        static int Remaining(Stopwatch clock)
        {
            long remaining = HostDeadlineMilliseconds - clock.ElapsedMilliseconds; Require(remaining > 0);
            return (int)Math.Min(remaining, Int32.MaxValue);
        }

        static string ReadBoundedLineAsync(StreamReader reader, Stopwatch clock, int maximumWaitMilliseconds)
        {
            var value = new StringBuilder(); var one = new char[1]; int bytes = 0; var lineClock = Stopwatch.StartNew();
            while (true)
            {
                long lineRemaining = maximumWaitMilliseconds - lineClock.ElapsedMilliseconds; Require(lineRemaining > 0);
                Task<int> read = reader.ReadAsync(one, 0, 1); Require(read.Wait((int)Math.Min(lineRemaining, Remaining(clock))));
                if (read.Result == 0) return value.Length == 0 ? null : value.ToString();
                if (one[0] == '\n') { if (value.Length > 0 && value[value.Length - 1] == '\r') value.Length--; return value.ToString(); }
                // Per-code-unit counting is conservative for surrogate pairs.
                bytes += Encoding.UTF8.GetByteCount(one); Require(bytes <= MaximumBytes); value.Append(one[0]);
            }
        }

        static void WriteBoundedLineAsync(StreamWriter writer, string line, Stopwatch clock)
        {
            Require(line != null && Encoding.UTF8.GetByteCount(line) <= MaximumBytes);
            Task write = writer.WriteLineAsync(line); Require(write.Wait(Math.Min(20000, Remaining(clock))));
            Task flush = writer.FlushAsync(); Require(flush.Wait(Math.Min(20000, Remaining(clock))));
        }

        static Task<bool> DrainStderrBoundedAsync(StreamReader reader)
        {
            return Task.Factory.StartNew(() => {
                var buffer = new char[256]; int total = 0; bool present = false; int count;
                while ((count = reader.Read(buffer, 0, buffer.Length)) > 0) { present = true; total += Encoding.UTF8.GetByteCount(buffer, 0, count); Require(total <= MaximumBytes); }
                return present;
            });
        }

        static void ValidateEnvironment(IDictionary<string, string> environment)
        {
            string[] keys = { "EXPECTED_SUPABASE_ENVIRONMENT", "EXPECTED_SUPABASE_PROJECT_REF", "EXPECTED_SUPABASE_TARGET_BINDING_SHA256", "SUPABASE_DB_CONNECTION_MODE", "EXPECTED_SUPABASE_POOLER_HOST", "SUPABASE_DB_URL", "SUPABASE_SSL_ROOT_CERT", "EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256" };
            Require(environment != null && environment.Count == keys.Length);
            foreach (string key in keys) Require(environment.ContainsKey(key) && !String.IsNullOrEmpty(environment[key]) && environment[key].IndexOf('\0') < 0);
            Require(environment["EXPECTED_SUPABASE_ENVIRONMENT"] == "production" && environment["SUPABASE_DB_CONNECTION_MODE"] == "session-pooler");
            RequireHash(environment["EXPECTED_SUPABASE_TARGET_BINDING_SHA256"]); RequireHash(environment["EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256"]);
            Require(environment["EXPECTED_SUPABASE_TARGET_BINDING_SHA256"] == Installation.TargetBindingSha256 && environment["EXPECTED_SUPABASE_PROJECT_REF"] == Installation.ProjectRef);
        }

        static Dictionary<string, object> ValidateAdmission(JavaScriptSerializer json)
        {
            var value = ObjectMap(json, Installation.ReadIsolationAdmission());
            string[] keys = { "sourceCommit", "sourceTree", "sourceManifestSha256", "approvedPackageSha256", "rawModuleSha256", "toolchainSha256", "targetBindingSha256", "tlsAdmissionSha256", "egressAdmissionSha256", "isolationPlanSha256", "managementApiCapabilitySha256" };
            Require(Exact(value, keys)); RequireSha40(StringValue(value, "sourceCommit")); RequireSha40(StringValue(value, "sourceTree"));
            foreach (string key in keys) if (key != "sourceCommit" && key != "sourceTree") RequireHash(StringValue(value, key));
            Require(StringValue(value, "sourceCommit") == Installation.SourceCommit && StringValue(value, "targetBindingSha256") == Installation.TargetBindingSha256 && StringValue(value, "isolationPlanSha256") == Installation.IsolationPlanSha256);
            return value;
        }

        static Dictionary<string, object> ValidateRuntimeRecords(JavaScriptSerializer json)
        {
            var value = new Dictionary<string, object>(StringComparer.Ordinal) {
                { "controlAdmission", Installation.ReadControlAdmission() }, { "probeContext", Installation.ReadProbeContext() }, { "sourceOptions", Installation.ReadSourceOptions() }, { "psqlTool", Installation.ReadPsqlTool() },
            };
            var source = ObjectMap(json, value["sourceOptions"]); Require(Exact(source, "commit", "gitExecutable", "expectedGitSha256")); Require(StringValue(source, "commit") == Installation.SourceCommit); RequireHash(StringValue(source, "expectedGitSha256")); Require(!String.IsNullOrWhiteSpace(StringValue(source, "gitExecutable")));
            RequireLeasedTool(StringValue(source, "gitExecutable"), StringValue(source, "expectedGitSha256"));
            var psql = ObjectMap(json, value["psqlTool"]); Require(Exact(psql, "psqlExecutable", "expectedPsqlSha256", "expectedPsqlVersion")); RequireHash(StringValue(psql, "expectedPsqlSha256")); Require(!String.IsNullOrWhiteSpace(StringValue(psql, "psqlExecutable")) && !String.IsNullOrWhiteSpace(StringValue(psql, "expectedPsqlVersion")));
            RequireLeasedTool(StringValue(psql, "psqlExecutable"), StringValue(psql, "expectedPsqlSha256"));
            var controls = ObjectMap(json, value["controlAdmission"]);
            Require(Exact(controls, "schemaVersion", "kind", "sourceSha", "targetBindingSha256", "isolationPlanSha256", "operatorIpv4Cidr", "exclusionIpv4Cidr", "operatorIpv6EgressUnavailable"));
            Require(StringValue(controls, "kind") == "production-temporary-isolation-admission" && StringValue(controls, "sourceSha") == Installation.SourceCommit && StringValue(controls, "targetBindingSha256") == Installation.TargetBindingSha256 && StringValue(controls, "isolationPlanSha256") == Installation.IsolationPlanSha256 && controls["operatorIpv6EgressUnavailable"] is bool && (bool)controls["operatorIpv6EgressUnavailable"]);
            string ipv4 = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}/32";
            Require(Regex.IsMatch(StringValue(controls, "operatorIpv4Cidr"), "\\A" + ipv4 + "\\z") && Regex.IsMatch(StringValue(controls, "exclusionIpv4Cidr"), "\\A" + ipv4 + "\\z") && StringValue(controls, "operatorIpv4Cidr") != StringValue(controls, "exclusionIpv4Cidr") && StringValue(controls, "exclusionIpv4Cidr") != "0.0.0.0/32");
            var probe = ObjectMap(json, value["probeContext"]);
            Require(Exact(probe, "sourceSha", "sourceTree", "sourceManifestSha256", "targetBindingSha256", "isolationPlanSha256", "databaseRoleGraphSha256", "trustedBackendProfileSha256", "priorRealtimeServiceEnabled", "priorRealtimeConfigSha256"));
            Require(StringValue(probe, "sourceSha") == Installation.SourceCommit && StringValue(probe, "targetBindingSha256") == Installation.TargetBindingSha256 && StringValue(probe, "isolationPlanSha256") == Installation.IsolationPlanSha256 && probe["priorRealtimeServiceEnabled"] is bool && (bool)probe["priorRealtimeServiceEnabled"]);
            RequireSha40(StringValue(probe, "sourceTree")); foreach (string key in new[] { "sourceManifestSha256", "databaseRoleGraphSha256", "trustedBackendProfileSha256", "priorRealtimeConfigSha256" }) RequireHash(StringValue(probe, key));
            return value;
        }

        static Dictionary<string, object> LoadRuntimeSecrets(Dictionary<string, object> records, string project)
        {
            Require(records != null && Exact(records, "controlAdmission", "probeContext", "sourceOptions", "psqlTool"));
            var value = new Dictionary<string, object>(records, StringComparer.Ordinal) {
                { "managementApiToken", Installation.ReadManagementApiToken() },
                { "anonymousKey", Installation.ReadAnonymousKey(project) },
                { "serviceRoleKey", Installation.ReadServiceRoleKey(project) },
            };
            Require(Exact(value, "managementApiToken", "anonymousKey", "serviceRoleKey", "controlAdmission", "probeContext", "sourceOptions", "psqlTool"));
            foreach (string key in new[] { "managementApiToken", "anonymousKey", "serviceRoleKey" }) Require(!String.IsNullOrWhiteSpace(value[key] as string));
            return value;
        }

        static void ClearRuntimeSecrets(Dictionary<string, object> value)
        {
            if (value == null) return;
            foreach (string key in new[] { "managementApiToken", "anonymousKey", "serviceRoleKey" })
                if (value.ContainsKey(key)) value[key] = String.Empty;
        }

        static object Sign(JavaScriptSerializer json, object value)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json.Serialize(value));
            try { Require(bytes.Length <= MaximumBytes); using (var rsa = new RSACryptoServiceProvider()) { rsa.PersistKeyInCsp = false; rsa.FromXmlString(Installation.OriginPrivateKey); return new { payload = Convert.ToBase64String(bytes), signature = Convert.ToBase64String(rsa.SignData(bytes, CryptoConfig.MapNameToOID("SHA256"))) }; } }
            finally { Array.Clear(bytes, 0, bytes.Length); }
        }

        static Dictionary<string, object> Seal(JavaScriptSerializer json, IDictionary<string, object> request, string nonce)
        {
            Require(Exact(request, "kind", "nonce", "correlation", "context", "priorState"));
            Require(StringValue(request, "kind") == "seal-prior-state" && StringValue(request, "nonce") == nonce && Correlation.IsMatch(StringValue(request, "correlation")));
            var context = ObjectMap(json, request["context"]); Require(Exact(context, "sourceSha", "targetBindingSha256", "isolationPlanSha256"));
            Require(StringValue(context, "sourceSha") == Installation.SourceCommit && StringValue(context, "targetBindingSha256") == Installation.TargetBindingSha256 && StringValue(context, "isolationPlanSha256") == Installation.IsolationPlanSha256);
            var prior = ObjectMap(json, request["priorState"]); Require(Exact(prior, "auth", "realtime", "postgrest", "networkRestrictions"));
            string contextJson = json.Serialize(context), priorJson = json.Serialize(prior); Require(Encoding.UTF8.GetByteCount(contextJson) + Encoding.UTF8.GetByteCount(priorJson) <= MaximumBytes);
            object receipt = Installation.SealIsolationPriorState(contextJson, priorJson); Require(receipt != null);
            return new Dictionary<string, object> { { "schemaVersion", 1 }, { "kind", "protected-production-isolation-prior-state-seal" }, { "nonce", nonce }, { "correlation", StringValue(request, "correlation") }, { "receipt", receipt } };
        }

        static readonly HashSet<string> EvidenceKeys = new HashSet<string>(StringComparer.Ordinal) {
            "schemaVersion", "kind", "sourceSha", "sourceTree", "sourceManifestSha256", "targetBindingSha256", "isolationPlanSha256", "capturedAtUtc", "collectionStartedAtUtc",
            "controlEvidenceOnly", "priorState", "dataApi", "realtime", "network", "requests", "authHookEnabled", "unknownAuthHookCount", "realtimeSuspended",
            "encrypted", "immutable", "ciphertextSha256", "prerequisiteAccepted", "dbSchemaDisabled", "otherPostgrestSettingsPreserved", "suspended", "shutdownAcknowledged",
            "exclusionApplied", "exclusionReadbackAccepted", "exclusionDenialProved", "operatorOnlyApplied", "operatorReadbackAccepted", "operatorReadOnlyAdmissionProved",
            "method", "path", "requestedAtUtc", "responseAtUtc", "existingSessionEstablished", "configDisableRequestedAtUtc", "configDisableResponseAtUtc", "configDisabledReadbackAtUtc", "independentPlatformReadbackCompleted", "shutdownRequestedAtUtc", "shutdownResponseAtUtc",
            "schema", "relation", "credentialRole", "credentialPreflightPassed", "authenticatedReadAdmissionPassed", "relationExists", "statementTriggerInventoryComplete", "enabledStatementTriggerCount",
            "managementApiControlObserved", "dbSchema", "otherPostgrestSettingsPreserved", "dataApiDisabled", "independentFromControlObservation", "authenticatedWritePathAttempted", "denialCause", "requestDenied", "writeCommitted", "writeObserved", "requestMethod", "contentProfile", "requestContentType", "requestBody", "httpStatus", "providerErrorCode",
            "authHookEnabled", "unknownAuthHookCount", "realtimeSuspended", "serviceEnabled", "configSha256", "independentFromControlObservation", "controlMethod", "priorRealtimeServiceEnabled", "configDisableHttpStatus", "configDisabledReadbackServiceEnabled", "configDisabledReadbackSha256", "shutdownHttpStatus", "existingConnectionEstablishedBeforeIsolation", "existingSubscriptionAcknowledgedBeforeIsolation", "existingConnectionDisconnectedByService", "existingConnectionClosedByCaller", "existingConnectionEstablishedAtUtc", "existingSubscriptionAcknowledgedAtUtc", "existingConnectionDisconnectedAtUtc", "reconnectAttemptedAtUtc", "reconnectDeniedAtUtc", "connectionAttempted", "connectionDenied",
            "dataApiPrerequisite", "dataApiControl", "dataApiDenial", "platformReadback", "realtimePriorState", "realtimeShutdownQuiescence", "poolerProbes", "networkReadbacks", "databaseDrainAggregate", "outcome", "freshReadOnlyTransactionConfirmed", "appliedConfigurationSha256", "restrictionStatus", "requestedConfigurationMatched", "previousConfigurationMatched", "ipv4AllowlistCount", "ipv6AllowlistCount", "summary",
            "allApplicableSessionsObserved", "applicableApplicationSessionCount", "inflightWriteCount", "preparedApplicationWriteCount", "existingApplicationSessionCount", "replicationSlotInventoryComplete", "activeReplicationSlotCount", "subscriptionInventoryComplete", "enabledSubscriptionCount",
            "hook_custom_access_token_enabled", "hook_mfa_verification_attempt_enabled", "hook_password_verification_attempt_enabled", "hook_send_sms_enabled", "hook_send_email_enabled", "hook_before_user_created_enabled", "hook_after_user_created_enabled"
        };
        static readonly HashSet<string> EvidenceKinds = new HashSet<string>(StringComparer.Ordinal) {
            "production-isolation-prior-state-sealed", "production-temporary-isolation-controls", "production-isolation-live-adapter-control-journal",
            "production-data-api-write-probe-prerequisite", "production-data-api-disable-management-observation", "production-data-api-denial-probe",
            "production-platform-isolation-observation", "production-realtime-prior-state-observation", "production-realtime-shutdown-quiescence-observation",
            "production-session-pooler-readonly-probe", "production-database-drain-observation"
        };
        static readonly HashSet<string> EvidenceBooleanKeys = new HashSet<string>(StringComparer.Ordinal) {
            "controlEvidenceOnly", "encrypted", "immutable", "prerequisiteAccepted", "dbSchemaDisabled", "otherPostgrestSettingsPreserved", "suspended", "shutdownAcknowledged",
            "requestedConfigurationMatched", "previousConfigurationMatched", "exclusionApplied", "exclusionReadbackAccepted", "exclusionDenialProved", "operatorOnlyApplied", "operatorReadbackAccepted", "operatorReadOnlyAdmissionProved",
            "existingSessionEstablished", "independentPlatformReadbackCompleted", "credentialPreflightPassed", "authenticatedReadAdmissionPassed", "relationExists", "statementTriggerInventoryComplete",
            "managementApiControlObserved", "dataApiDisabled", "independentFromControlObservation", "authenticatedWritePathAttempted", "requestDenied", "writeCommitted", "writeObserved", "realtimeSuspended", "serviceEnabled", "priorRealtimeServiceEnabled", "configDisabledReadbackServiceEnabled", "existingConnectionEstablishedBeforeIsolation", "existingSubscriptionAcknowledgedBeforeIsolation", "existingConnectionDisconnectedByService", "existingConnectionClosedByCaller", "connectionAttempted", "connectionDenied", "freshReadOnlyTransactionConfirmed", "allApplicableSessionsObserved", "replicationSlotInventoryComplete", "subscriptionInventoryComplete",
            "hook_custom_access_token_enabled", "hook_mfa_verification_attempt_enabled", "hook_password_verification_attempt_enabled", "hook_send_sms_enabled", "hook_send_email_enabled", "hook_before_user_created_enabled", "hook_after_user_created_enabled"
        };
        static readonly HashSet<string> EvidenceCountKeys = new HashSet<string>(StringComparer.Ordinal) {
            "unknownAuthHookCount", "enabledStatementTriggerCount", "httpStatus", "configDisableHttpStatus", "shutdownHttpStatus", "ipv4AllowlistCount", "ipv6AllowlistCount", "applicableApplicationSessionCount", "inflightWriteCount", "preparedApplicationWriteCount", "existingApplicationSessionCount", "activeReplicationSlotCount", "enabledSubscriptionCount"
        };
        static bool SafeEvidenceString(string key, string value)
        {
            if (value == null || Encoding.UTF8.GetByteCount(value) > MaximumBytes) return false;
            if (key == "sourceSha" || key == "sourceTree") return Sha40.IsMatch(value);
            if (key.EndsWith("Sha256", StringComparison.Ordinal) || key == "targetBindingSha256" || key == "isolationPlanSha256" || key == "configSha256" || key == "ciphertextSha256" || key == "appliedConfigurationSha256") return Sha256.IsMatch(value);
            if (key.EndsWith("AtUtc", StringComparison.Ordinal)) return Regex.IsMatch(value, "\\A\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z\\z");
            if (key == "kind") return EvidenceKinds.Contains(value);
            if (key == "method") return value == "GET" || value == "PATCH" || value == "POST";
            if (key == "path") return value == "config/auth" || value == "config/realtime" || value == "postgrest" || value == "network-restrictions" || value == "config/realtime/shutdown" || value == "network-restrictions/apply";
            if (key == "schema") return value == "public";
            if (key == "relation") return value == "employees";
            if (key == "credentialRole") return value == "service_role";
            if (key == "dbSchema") return value == "";
            if (key == "denialCause") return value == "data-api-disabled" || value == "realtime-disabled-for-tenant" || value == "network-restriction";
            if (key == "requestMethod") return value == "POST";
            if (key == "contentProfile") return value == "public";
            if (key == "requestContentType") return value == "application/json";
            if (key == "requestBody") return value == "[]";
            if (key == "providerErrorCode") return value == "PGRST106" || value == "RealtimeDisabledForTenant";
            if (key == "controlMethod") return value == "supabase-management-api-realtime-disable-and-shutdown";
            if (key == "outcome") return value == "succeeded" || value == "denied_network_restriction";
            if (key == "restrictionStatus") return value == "applied" || value == "stored";
            return false;
        }
        static bool SafeEvidence(object value, int depth)
        {
            if (depth > 12 || value == null) return false;
            var map = value as IDictionary<string, object>;
            if (map != null)
            {
                foreach (var entry in map)
                {
                    string key = entry.Key ?? "";
                    if (!EvidenceKeys.Contains(key)) return false;
                    string text = entry.Value as string;
                    if (text != null) { if (!SafeEvidenceString(key, text)) return false; continue; }
                    if (EvidenceBooleanKeys.Contains(key)) { if (!(entry.Value is bool)) return false; continue; }
                    if (EvidenceCountKeys.Contains(key))
                    {
                        if (!(entry.Value is int)) return false; int number = (int)entry.Value;
                        if (number < 0 || number > 1000000000 || (key == "httpStatus" && (number < 100 || number > 599)) || ((key == "configDisableHttpStatus" || key == "shutdownHttpStatus") && number != 204)) return false;
                        continue;
                    }
                    if (key == "schemaVersion") { if (!(entry.Value is int)) return false; int number = (int)entry.Value; if (number != 1) return false; continue; }
                    if (!SafeEvidence(entry.Value, depth + 1)) return false;
                }
                return true;
            }
            var sequence = value as System.Collections.IEnumerable;
            if (sequence != null && !(value is string)) { int count = 0; foreach (object item in sequence) { if (++count > 128 || !SafeEvidence(item, depth + 1)) return false; } return true; }
            return false;
        }

        static Dictionary<string, object> EvidenceShape(JavaScriptSerializer json, object value, string fields)
        {
            var map = ObjectMap(json, value); Require(Exact(map, fields.Split(','))); return map;
        }
        static Dictionary<string, object> BoundEvidence(JavaScriptSerializer json, object value, string kind, string fields)
        {
            var map = EvidenceShape(json, value, "schemaVersion,kind,sourceSha,targetBindingSha256,isolationPlanSha256,capturedAtUtc" + (fields.Length == 0 ? "" : "," + fields));
            Require((int)map["schemaVersion"] == 1 && StringValue(map, "kind") == kind &&
                StringValue(map, "sourceSha") == Installation.SourceCommit && StringValue(map, "targetBindingSha256") == Installation.TargetBindingSha256 &&
                StringValue(map, "isolationPlanSha256") == Installation.IsolationPlanSha256); return map;
        }
        static void EvidenceFlag(IDictionary<string, object> map, string key, bool expected)
        { Require(map[key] is bool && (bool)map[key] == expected); }
        static void EvidenceNumber(IDictionary<string, object> map, string key, int expected)
        { Require(map[key] is int && (int)map[key] == expected); }
        static object[] EvidenceArray(object value, int count)
        {
            var rows = value as object[]; if (rows == null) { var list = value as System.Collections.ArrayList; if (list != null) rows = list.ToArray(); }
            Require(rows != null && rows.Length == count); return rows;
        }
        static object[] EvidenceArrayRange(object value, int minimum, int maximum)
        {
            var rows = value as object[]; if (rows == null) { var list = value as System.Collections.ArrayList; if (list != null) rows = list.ToArray(); }
            Require(rows != null && rows.Length >= minimum && rows.Length <= maximum); return rows;
        }
        static DateTime EvidenceTime(IDictionary<string, object> map, string key)
        {
            DateTime value; string text = StringValue(map, key);
            Require(DateTime.TryParseExact(text, "yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out value)); return value;
        }
        static void ValidateNestedEvidence(JavaScriptSerializer json, IDictionary<string, object> controls, IDictionary<string, object> journal, IDictionary<string, object> observations)
        {
            var seal = BoundEvidence(json, controls["priorState"], "production-isolation-prior-state-sealed", "encrypted,immutable,ciphertextSha256");
            EvidenceFlag(seal, "encrypted", true); EvidenceFlag(seal, "immutable", true);
            var api = EvidenceShape(json, controls["dataApi"], "capturedAtUtc,prerequisiteAccepted,dbSchemaDisabled,otherPostgrestSettingsPreserved");
            foreach (string key in new[] { "prerequisiteAccepted", "dbSchemaDisabled", "otherPostgrestSettingsPreserved" }) EvidenceFlag(api, key, true);
            var realtime = EvidenceShape(json, controls["realtime"], "capturedAtUtc,suspended,shutdownAcknowledged");
            EvidenceFlag(realtime, "suspended", true); EvidenceFlag(realtime, "shutdownAcknowledged", true);
            var network = EvidenceShape(json, controls["network"], "capturedAtUtc,exclusionApplied,exclusionReadbackAccepted,exclusionDenialProved,operatorOnlyApplied,operatorReadbackAccepted,operatorReadOnlyAdmissionProved");
            foreach (string key in new[] { "exclusionApplied", "exclusionReadbackAccepted", "exclusionDenialProved", "operatorOnlyApplied", "operatorReadbackAccepted", "operatorReadOnlyAdmissionProved" }) EvidenceFlag(network, key, true);

            // Nine fixed controls, then exactly two non-retried POSTs, each with
            // 1..20 sequential readbacks. The controller has the same explicit
            // poll bound and a non-resetting 20s deadline per phase.
            var requests = EvidenceArrayRange(journal["requests"], 13, 51);
            string[] methods = { "GET", "GET", "GET", "GET", "PATCH", "GET", "PATCH", "GET", "POST" };
            string[] paths = { "config/auth", "config/realtime", "postgrest", "network-restrictions", "postgrest", "postgrest", "config/realtime", "config/realtime", "config/realtime/shutdown" };
            var requestMaps = new List<Dictionary<string, object>>(); DateTime previousResponse = DateTime.MinValue;
            for (int index = 0; index < requests.Length; index++) {
                var item = EvidenceShape(json, requests[index], "method,path,requestedAtUtc,responseAtUtc");
                DateTime requested = EvidenceTime(item, "requestedAtUtc"), responded = EvidenceTime(item, "responseAtUtc");
                Require(previousResponse <= requested && requested <= responded); previousResponse = responded;
                if (index < 9) Require(StringValue(item, "method") == methods[index] && StringValue(item, "path") == paths[index]);
                requestMaps.Add(item);
            }
            var networkGetIndexes = new List<int>(); var phaseEnds = new List<int>(); var phasePosts = new List<int>();
            int cursor = 9;
            for (int phase = 0; phase < 2; phase++) {
                Require(cursor < requestMaps.Count && StringValue(requestMaps[cursor], "method") == "POST" &&
                    StringValue(requestMaps[cursor], "path") == "network-restrictions/apply"); phasePosts.Add(cursor++);
                int count = 0;
                while (cursor < requestMaps.Count && StringValue(requestMaps[cursor], "method") == "GET" &&
                       StringValue(requestMaps[cursor], "path") == "network-restrictions") {
                    Require(++count <= 20); networkGetIndexes.Add(cursor++);
                }
                Require(count >= 1); phaseEnds.Add(networkGetIndexes.Count - 1);
            }
            Require(cursor == requestMaps.Count);
            var timing = EvidenceShape(json, journal["realtime"], "existingSessionEstablished,configDisableRequestedAtUtc,configDisableResponseAtUtc,configDisabledReadbackAtUtc,independentPlatformReadbackCompleted,shutdownRequestedAtUtc,shutdownResponseAtUtc");
            EvidenceFlag(timing, "existingSessionEstablished", true); EvidenceFlag(timing, "independentPlatformReadbackCompleted", true);
            Require(StringValue(timing, "configDisableRequestedAtUtc") == StringValue(requestMaps[6], "requestedAtUtc") &&
                StringValue(timing, "configDisableResponseAtUtc") == StringValue(requestMaps[6], "responseAtUtc") &&
                StringValue(timing, "configDisabledReadbackAtUtc") == StringValue(requestMaps[7], "responseAtUtc") &&
                StringValue(timing, "shutdownRequestedAtUtc") == StringValue(requestMaps[8], "requestedAtUtc") &&
                StringValue(timing, "shutdownResponseAtUtc") == StringValue(requestMaps[8], "responseAtUtc"));

            var prerequisite = BoundEvidence(json, observations["dataApiPrerequisite"], "production-data-api-write-probe-prerequisite", "schema,relation,credentialRole,credentialPreflightPassed,authenticatedReadAdmissionPassed,relationExists,statementTriggerInventoryComplete,enabledStatementTriggerCount");
            foreach (string key in new[] { "credentialPreflightPassed", "authenticatedReadAdmissionPassed", "relationExists", "statementTriggerInventoryComplete" }) EvidenceFlag(prerequisite, key, true);
            EvidenceNumber(prerequisite, "enabledStatementTriggerCount", 0);
            var disable = BoundEvidence(json, observations["dataApiControl"], "production-data-api-disable-management-observation", "managementApiControlObserved,dbSchema,otherPostgrestSettingsPreserved,dataApiDisabled");
            foreach (string key in new[] { "managementApiControlObserved", "otherPostgrestSettingsPreserved", "dataApiDisabled" }) EvidenceFlag(disable, key, true);
            var denial = BoundEvidence(json, observations["dataApiDenial"], "production-data-api-denial-probe", "independentFromControlObservation,authenticatedWritePathAttempted,denialCause,requestDenied,writeCommitted,requestMethod,relation,contentProfile,requestContentType,requestBody,httpStatus,providerErrorCode");
            foreach (string key in new[] { "independentFromControlObservation", "authenticatedWritePathAttempted", "requestDenied" }) EvidenceFlag(denial, key, true);
            EvidenceFlag(denial, "writeCommitted", false); EvidenceNumber(denial, "httpStatus", 406);
            Require(StringValue(denial, "denialCause") == "data-api-disabled" && StringValue(denial, "providerErrorCode") == "PGRST106");
            var platform = BoundEvidence(json, observations["platformReadback"], "production-platform-isolation-observation", "authHookEnabled,unknownAuthHookCount,realtimeSuspended");
            EvidenceFlag(platform, "realtimeSuspended", true); EvidenceNumber(platform, "unknownAuthHookCount", 0);
            var hooks = EvidenceShape(json, platform["authHookEnabled"], "hook_custom_access_token_enabled,hook_mfa_verification_attempt_enabled,hook_password_verification_attempt_enabled,hook_send_sms_enabled,hook_send_email_enabled,hook_before_user_created_enabled,hook_after_user_created_enabled");
            foreach (string key in hooks.Keys) EvidenceFlag(hooks, key, false);
            var prior = BoundEvidence(json, observations["realtimePriorState"], "production-realtime-prior-state-observation", "serviceEnabled,configSha256"); EvidenceFlag(prior, "serviceEnabled", true);
            var shutdown = BoundEvidence(json, observations["realtimeShutdownQuiescence"], "production-realtime-shutdown-quiescence-observation", "independentFromControlObservation,controlMethod,priorRealtimeServiceEnabled,configDisableRequestedAtUtc,configDisableResponseAtUtc,configDisableHttpStatus,configDisabledReadbackAtUtc,configDisabledReadbackServiceEnabled,configDisabledReadbackSha256,shutdownRequestedAtUtc,shutdownResponseAtUtc,shutdownHttpStatus,existingConnectionEstablishedBeforeIsolation,existingSubscriptionAcknowledgedBeforeIsolation,existingConnectionDisconnectedByService,existingConnectionClosedByCaller,existingConnectionEstablishedAtUtc,existingSubscriptionAcknowledgedAtUtc,existingConnectionDisconnectedAtUtc,reconnectAttemptedAtUtc,reconnectDeniedAtUtc,connectionAttempted,connectionDenied,writeObserved,httpStatus,providerErrorCode,denialCause");
            foreach (string key in new[] { "independentFromControlObservation", "priorRealtimeServiceEnabled", "existingConnectionEstablishedBeforeIsolation", "existingSubscriptionAcknowledgedBeforeIsolation", "existingConnectionDisconnectedByService", "connectionAttempted", "connectionDenied" }) EvidenceFlag(shutdown, key, true);
            foreach (string key in new[] { "configDisabledReadbackServiceEnabled", "existingConnectionClosedByCaller", "writeObserved" }) EvidenceFlag(shutdown, key, false);
            EvidenceNumber(shutdown, "configDisableHttpStatus", 204); EvidenceNumber(shutdown, "shutdownHttpStatus", 204); EvidenceNumber(shutdown, "httpStatus", 403);
            Require(StringValue(shutdown, "denialCause") == "realtime-disabled-for-tenant" && StringValue(shutdown, "providerErrorCode") == "RealtimeDisabledForTenant");
            foreach (string key in new[] { "configDisableRequestedAtUtc", "configDisableResponseAtUtc", "configDisabledReadbackAtUtc", "shutdownRequestedAtUtc", "shutdownResponseAtUtc" }) Require(StringValue(shutdown, key) == StringValue(timing, key));

            var poolers = EvidenceArray(observations["poolerProbes"], 3);
            var poolerMaps = new List<Dictionary<string, object>>();
            for (int index = 0; index < poolers.Length; index++) {
                var probe = BoundEvidence(json, poolers[index], "production-session-pooler-readonly-probe", "outcome,freshReadOnlyTransactionConfirmed");
                Require(StringValue(probe, "outcome") == (index == 1 ? "denied_network_restriction" : "succeeded")); EvidenceFlag(probe, "freshReadOnlyTransactionConfirmed", index != 1);
                poolerMaps.Add(probe);
            }
            Require(EvidenceTime(poolerMaps[0], "capturedAtUtc") <= EvidenceTime(requestMaps[0], "requestedAtUtc"));
            var readbacks = EvidenceArray(observations["networkReadbacks"], networkGetIndexes.Count);
            var readbackMaps = new List<Dictionary<string, object>>();
            var requestedHashes = new Dictionary<string, string>(StringComparer.Ordinal);
            for (int index = 0; index < readbacks.Length; index++) {
                var readback = EvidenceShape(json, readbacks[index], "capturedAtUtc,appliedConfigurationSha256,restrictionStatus,requestedConfigurationMatched,previousConfigurationMatched,ipv4AllowlistCount,ipv6AllowlistCount");
                bool requested = (bool)readback["requestedConfigurationMatched"], previous = (bool)readback["previousConfigurationMatched"];
                string status = StringValue(readback, "restrictionStatus");
                Require(status == "stored" ? requested : status == "applied" && (requested || previous));
                if (requested) {
                    EvidenceNumber(readback, "ipv4AllowlistCount", 1); EvidenceNumber(readback, "ipv6AllowlistCount", 0);
                    string bucket = (index <= phaseEnds[0] ? "exclusion:" : "operator:") + status;
                    string hash = StringValue(readback, "appliedConfigurationSha256"), priorHash;
                    if (requestedHashes.TryGetValue(bucket, out priorHash)) Require(hash == priorHash);
                    else requestedHashes.Add(bucket, hash);
                }
                int journalIndex = networkGetIndexes[index]; DateTime captured = EvidenceTime(readback, "capturedAtUtc");
                DateTime upper = journalIndex + 1 < requestMaps.Count ? EvidenceTime(requestMaps[journalIndex + 1], "requestedAtUtc") : EvidenceTime(network, "capturedAtUtc");
                Require(EvidenceTime(requestMaps[journalIndex], "responseAtUtc") <= captured && captured <= upper);
                readbackMaps.Add(readback);
            }
            foreach (int endIndex in phaseEnds) {
                var final = readbackMaps[endIndex]; Require(StringValue(final, "restrictionStatus") == "applied");
                EvidenceFlag(final, "requestedConfigurationMatched", true);
                EvidenceNumber(final, "ipv4AllowlistCount", 1); EvidenceNumber(final, "ipv6AllowlistCount", 0);
            }
            Require(StringValue(readbackMaps[phaseEnds[0]], "appliedConfigurationSha256") != StringValue(readbackMaps[phaseEnds[1]], "appliedConfigurationSha256"));
            DateTime exclusionProbe = EvidenceTime(poolerMaps[1], "capturedAtUtc"), operatorProbe = EvidenceTime(poolerMaps[2], "capturedAtUtc");
            Require(EvidenceTime(readbackMaps[phaseEnds[0]], "capturedAtUtc") <= exclusionProbe && exclusionProbe <= EvidenceTime(requestMaps[phasePosts[1]], "requestedAtUtc"));
            Require(EvidenceTime(readbackMaps[phaseEnds[1]], "capturedAtUtc") <= operatorProbe && operatorProbe <= EvidenceTime(network, "capturedAtUtc"));
            var drain = EvidenceShape(json, observations["databaseDrainAggregate"], "collectionStartedAtUtc,capturedAtUtc,summary");
            var summary = EvidenceShape(json, drain["summary"], "allApplicableSessionsObserved,applicableApplicationSessionCount,inflightWriteCount,preparedApplicationWriteCount,existingApplicationSessionCount,replicationSlotInventoryComplete,activeReplicationSlotCount,subscriptionInventoryComplete,enabledSubscriptionCount");
            foreach (string key in new[] { "allApplicableSessionsObserved", "replicationSlotInventoryComplete", "subscriptionInventoryComplete" }) EvidenceFlag(summary, key, true);
            // Positive drain counters remain faithful controls-only aggregates.
            // The independent strict five-plane gate decides whether writers are absent.
        }


        // Test-only parser hook. It does not load records, create a process, or
        // disclose a receipt; it proves that unknown keys and free-text values fail closed.
        internal static bool ValidateFinalForTest(string text)
        {
            try
            {
                var json = new JavaScriptSerializer { MaxJsonLength = MaximumBytes, RecursionLimit = 32 };
                var value = json.Deserialize<Dictionary<string, object>>(text);
                RedactFinal(json, value); return true;
            }
            catch { return false; }
        }

        static string RedactFinal(JavaScriptSerializer json, IDictionary<string, object> result)
        {
            Require(Exact(result, "kind", "controlEvidenceOnly", "controls", "journal", "observations"));
            Require(StringValue(result, "kind") == "protected-production-isolation-complete" && result["controlEvidenceOnly"] is bool && (bool)result["controlEvidenceOnly"]);
            var controls = ObjectMap(json, result["controls"]);
            Require(Exact(controls, "schemaVersion", "sourceSha", "targetBindingSha256", "isolationPlanSha256", "capturedAtUtc", "kind", "controlEvidenceOnly", "priorState", "dataApi", "realtime", "network"));
            Require(StringValue(controls, "kind") == "production-temporary-isolation-controls" && StringValue(controls, "sourceSha") == Installation.SourceCommit && StringValue(controls, "targetBindingSha256") == Installation.TargetBindingSha256 && StringValue(controls, "isolationPlanSha256") == Installation.IsolationPlanSha256 && controls["controlEvidenceOnly"] is bool && (bool)controls["controlEvidenceOnly"]);
            var journal = ObjectMap(json, result["journal"]); Require(Exact(journal, "schemaVersion", "kind", "requests", "realtime")); Require(StringValue(journal, "kind") == "production-isolation-live-adapter-control-journal");
            var observations = ObjectMap(json, result["observations"]); Require(Exact(observations, "dataApiPrerequisite", "dataApiControl", "dataApiDenial", "platformReadback", "realtimePriorState", "realtimeShutdownQuiescence", "poolerProbes", "networkReadbacks", "databaseDrainAggregate"));
            Require(SafeEvidence(controls, 0) && SafeEvidence(journal, 0) && SafeEvidence(observations, 0));
            ValidateNestedEvidence(json, controls, journal, observations);
            return json.Serialize(result); // parsed, schema-checked, redacted evidence only; never relay raw child text.
        }

        internal static int Run(string[] args)
        {
            Process child = null; IntPtr job = IntPtr.Zero; ProtectedFileLease installed = null, source = null, runtime = null, privileged = null; var toolLeases = new List<ProtectedFileLease>(); ProductionInputs inputs = null; Dictionary<string, object> runtimeSecrets = null;
            try
            {
                Require(args.Length == 0);
                string root = Installation.Root, self = Path.Combine(Installation.Root, "production-isolation.exe");
                Require(String.Equals(Assembly.GetExecutingAssembly().Location, self, StringComparison.OrdinalIgnoreCase));
                installed = AcquireClosedLease(root, Installation.InstallationFiles);
                source = AcquireClosedLease(Installation.CleanSourceRoot, Installation.SourceFiles);
                runtime = AcquireClosedLease(Installation.RuntimeRoot, Installation.RuntimeFiles);
                // The fixed encrypted input, certificate, admission, API-key and
                // tool records are all hash-leased before any reader can expose a
                // capability.  Their generated paths cannot be selected by caller.
                privileged = AcquireClosedLease(Installation.PrivilegedRoot, Installation.PrivilegedFiles);
                foreach (var group in Installation.ToolGroups) toolLeases.Add(AcquireClosedLease(group.Root, group.Files));
                RequireLeasedInventoryFile(Installation.Root, Installation.InstallationFiles, Installation.NodeExecutable);
                Require(Hash(Path.Combine(root, "src", "lib", "release", "protected-production-isolation-worker.mjs")) == Installation.WorkerSha256);
                Require(Hash(Path.Combine(Installation.CleanSourceRoot, "src", "lib", "release", "production-isolation-live-adapter.mjs")) == Installation.LiveAdapterSha256);
                job = CreateJobObject(IntPtr.Zero, null); Require(job != IntPtr.Zero); activeIsolationJob = job; var limits = new JobLimits(); limits.Basic.Flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
                Require(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(JobLimits))));
                string windows = Directory.GetParent(Environment.SystemDirectory).FullName;
                var start = new ProcessStartInfo { FileName = Installation.NodeExecutable, Arguments = "--no-addons --no-global-search-paths --import \"" + new Uri(Path.Combine(root, "src", "lib", "release", "production-isolation-module-register.mjs")).AbsoluteUri + "\" \"" + Path.Combine(root, "src", "lib", "release", "protected-production-isolation-worker.mjs") + "\"", WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true };
                start.EnvironmentVariables.Clear(); start.EnvironmentVariables["SystemRoot"] = windows; start.EnvironmentVariables["WINDIR"] = windows; start.EnvironmentVariables["PATH"] = Environment.SystemDirectory; start.EnvironmentVariables["WS_NO_BUFFER_UTIL"] = "1"; start.EnvironmentVariables["WS_NO_UTF_8_VALIDATE"] = "1";
                child = Process.Start(start); Require(child != null && AssignProcessToJobObject(job, child.Handle));
                Task<bool> stderr = DrainStderrBoundedAsync(child.StandardError); var clock = Stopwatch.StartNew(); string ready = ReadBoundedLineAsync(child.StandardOutput, clock, ReadyTimeoutMilliseconds);
                var match = Regex.Match(ready ?? "", "\\A\\{\\\"kind\\\":\\\"protected-production-isolation-ready\\\",\\\"nonce\\\":\\\"([a-f0-9]{64})\\\"\\}\\z"); Require(match.Success && Nonce.IsMatch(match.Groups[1].Value)); string nonce = match.Groups[1].Value;
                // The fixed admission and tool/probe records are validated after their
                // leases but before decrypting credentials or reading API-key material.
                var json = new JavaScriptSerializer { MaxJsonLength = MaximumBytes, RecursionLimit = 32 };
                var admission = ValidateAdmission(json); var runtimeRecords = ValidateRuntimeRecords(json);
                inputs = ProductionInputs.Load(Installation.InputRoot); var environment = new Dictionary<string, string>(inputs.EnvironmentValues, StringComparer.Ordinal) { { "EXPECTED_SUPABASE_TARGET_BINDING_SHA256", Installation.TargetBindingSha256 } }; ValidateEnvironment(environment);
                runtimeSecrets = LoadRuntimeSecrets(runtimeRecords, Installation.ProjectRef);
                WriteBoundedLineAsync(child.StandardInput, json.Serialize(Sign(json, new { schemaVersion = 1, operation = "temporary-production-isolation", nonce = nonce, workspace = Installation.CleanSourceRoot, environment = environment, admission = admission, runtime = runtimeSecrets })), clock);
                bool sealedOnce = false; string final = null;
                while (final == null) { string line = ReadBoundedLineAsync(child.StandardOutput, clock, Remaining(clock)); Require(line != null); var message = json.Deserialize<Dictionary<string, object>>(line); if (message != null && message.ContainsKey("kind") && (message["kind"] as string) == "seal-prior-state") { Require(!sealedOnce); sealedOnce = true; WriteBoundedLineAsync(child.StandardInput, json.Serialize(Sign(json, Seal(json, message, nonce))), clock); } else final = RedactFinal(json, message); }
                child.StandardInput.Close(); Require(child.WaitForExit(Remaining(clock)) && stderr.Wait(Math.Min(DrainTimeoutMilliseconds, Remaining(clock))) && child.ExitCode == 0 && !stderr.Result); Console.WriteLine(final); return 0;
            }
            catch { Console.Error.WriteLine("Protected production isolation did not complete. Production remains paused."); return 1; }
            finally { ClearRuntimeSecrets(runtimeSecrets); ProductionIsolationPrivateRuntime.ClearRuntimeSecrets(); activeIsolationJob = IntPtr.Zero; if (job != IntPtr.Zero) CloseHandle(job); if (child != null) { try { if (!child.HasExited) child.Kill(); } catch { } child.Dispose(); } if (inputs != null) inputs.Dispose(); for (int index = toolLeases.Count - 1; index >= 0; index--) toolLeases[index].Dispose(); if (privileged != null) privileged.Dispose(); if (runtime != null) runtime.Dispose(); if (source != null) source.Dispose(); if (installed != null) installed.Dispose(); }
        }
    }
}
