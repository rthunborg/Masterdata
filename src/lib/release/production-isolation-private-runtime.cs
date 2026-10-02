using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace HrMasterdata.Release
{
    // Internal implementation of the installed host's fixed private capability.
    // These helpers have no command-line dispatch and never print raw values.
    internal static class ProductionIsolationPrivateRuntime
    {
        const int MaximumBytes = 65536;
        static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = MaximumBytes, RecursionLimit = 32 };
        static string token, anonymousKey, serviceRoleKey;
        static void Require(bool ok) { if (!ok) throw new InvalidOperationException("Production isolation private capability refused"); }
        static string Digest(byte[] bytes) { using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant(); }
        internal static Dictionary<string, object> ReadFixedRecord(string fixedPath, string expectedSha256)
        {
            Require(Path.IsPathRooted(fixedPath) && Regex.IsMatch(expectedSha256 ?? "", "\\A[a-f0-9]{64}\\z"));
            byte[] bytes = null;
            try
            {
                using (var input = new FileStream(fixedPath, FileMode.Open, FileAccess.Read, FileShare.Read))
                {
                    Require(input.Length > 0 && input.Length <= MaximumBytes);
                    bytes = new byte[(int)input.Length]; int offset = 0;
                    while (offset < bytes.Length) { int count = input.Read(bytes, offset, bytes.Length - offset); Require(count > 0); offset += count; }
                }
                Require(Digest(bytes) == expectedSha256);
                var utf8 = new UTF8Encoding(false, true);
                var value = Json.Deserialize<Dictionary<string, object>>(utf8.GetString(bytes)); Require(value != null); return value;
            }
            catch { throw new InvalidOperationException("Production isolation private record refused"); }
            finally { if (bytes != null) Array.Clear(bytes, 0, bytes.Length); }
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Credential
        {
            public uint Flags, Type; public IntPtr TargetName, Comment; public long LastWritten;
            public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist, AttributeCount;
            public IntPtr Attributes, TargetAlias, UserName;
        }
        [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool CredRead(string target, uint type, uint reserved, out IntPtr credential);
        [DllImport("advapi32.dll")] static extern void CredFree(IntPtr credential);

        internal static string ReadManagementApiToken()
        {
            if (token != null) return token;
            foreach (string target in new[] { "Supabase CLI:supabase", "Supabase CLI:access-token" })
            {
                IntPtr pointer; if (!CredRead(target, 1, 0, out pointer)) continue; byte[] bytes = null;
                try
                {
                    var credential = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
                    if (credential.CredentialBlobSize == 0 || credential.CredentialBlobSize > 4096) continue;
                    bytes = new byte[credential.CredentialBlobSize]; Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
                    foreach (var encoding in new Encoding[] { Encoding.UTF8, Encoding.Unicode })
                    {
                        string value = encoding.GetString(bytes).TrimEnd('\0');
                        if (Regex.IsMatch(value, "\\Asbp_(oauth_)?[a-f0-9]{40}\\z")) { token = value; return token; }
                    }
                }
                finally { if (bytes != null) Array.Clear(bytes, 0, bytes.Length); CredFree(pointer); }
            }
            throw new InvalidOperationException("Reviewed Supabase CLI credential unavailable");
        }

        internal static Uri FixedApiKeyUri(string project)
        {
            Require(project == Installation.ProjectRef && Regex.IsMatch(project ?? "", "\\A[a-z0-9]{20}\\z"));
            return new Uri("https://api.supabase.com/v1/projects/" + project + "/api-keys?reveal=true");
        }
        static void ValidateLegacyKey(string key, string role, string project)
        {
            Require(key != null && key.Length >= 8 && key.Length <= 4096 && !Regex.IsMatch(key, "[\\r\\n\\0]"));
            string[] parts = key.Split('.'); Require(parts.Length == 3);
            byte[] bytes = null;
            try
            {
                string payload = parts[1].Replace('-', '+').Replace('_', '/');
                payload = payload.PadRight(payload.Length + ((4 - payload.Length % 4) % 4), '=');
                bytes = Convert.FromBase64String(payload); Require(bytes.Length <= 4096);
                var claims = Json.Deserialize<Dictionary<string, object>>(new UTF8Encoding(false, true).GetString(bytes));
                Require(claims != null && claims.ContainsKey("role") && (claims["role"] as string) == role &&
                    claims.ContainsKey("ref") && (claims["ref"] as string) == project);
            }
            finally { if (bytes != null) Array.Clear(bytes, 0, bytes.Length); }
        }
        internal static Dictionary<string,string> ParseLegacyApiKeys(byte[] bytes, string project)
        {
            Require(bytes != null && bytes.Length > 0 && bytes.Length <= MaximumBytes && project == Installation.ProjectRef);
            var values = Json.Deserialize<object[]>(new UTF8Encoding(false, true).GetString(bytes)); Require(values != null && values.Length <= 32);
            string foundAnonymous = null, foundService = null;
            foreach (object item in values)
            {
                var value = item as Dictionary<string, object>; Require(value != null);
                object rawName; if (!value.TryGetValue("name", out rawName)) continue;
                string name = rawName as string; if (name != "anon" && name != "service_role") continue;
                object rawType; Require(value.TryGetValue("type", out rawType) && (rawType as string) == "legacy");
                object rawKey; Require(value.TryGetValue("api_key", out rawKey)); string key = rawKey as string;
                ValidateLegacyKey(key, name, project);
                if (name == "anon") { Require(foundAnonymous == null); foundAnonymous = key; }
                else { Require(foundService == null); foundService = key; }
            }
            Require(foundAnonymous != null && foundService != null);
            return new Dictionary<string,string> { {"anon",foundAnonymous}, {"service_role",foundService} };
        }
        static void ReadProjectApiKeys(string project)
        {
            Uri uri = FixedApiKeyUri(project); // Refuse project selection before credential access.
            if (anonymousKey != null && serviceRoleKey != null) return;
            byte[] bytes = null;
            try
            {
                using (var handler = new HttpClientHandler { AllowAutoRedirect = false })
                using (var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(20), MaxResponseContentBufferSize = MaximumBytes })
                using (var request = new HttpRequestMessage(HttpMethod.Get, uri))
                {
                    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ReadManagementApiToken());
                    request.Headers.Accept.ParseAdd("application/json");
                    using (var response = client.SendAsync(request, HttpCompletionOption.ResponseContentRead).GetAwaiter().GetResult())
                    {
                        Require(response.StatusCode == HttpStatusCode.OK);
                        bytes = response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult(); Require(bytes.Length > 0 && bytes.Length <= MaximumBytes);
                        var keys = ParseLegacyApiKeys(bytes, project);
                        anonymousKey = keys["anon"]; serviceRoleKey = keys["service_role"];
                    }
                }
            }
            catch { throw new InvalidOperationException("Production isolation API capability refused"); }
            finally { if (bytes != null) Array.Clear(bytes, 0, bytes.Length); }
        }
        internal static string ReadAnonymousKey(string project) { ReadProjectApiKeys(project); return anonymousKey; }
        internal static string ReadServiceRoleKey(string project) { ReadProjectApiKeys(project); return serviceRoleKey; }
        internal static void ClearRuntimeSecrets() { token = null; anonymousKey = null; serviceRoleKey = null; }

        static Task<string> ReadBoundedAsync(StreamReader reader)
        {
            return Task.Factory.StartNew(() => {
                var result = new StringBuilder(); var buffer = new char[256]; int bytes = 0, count;
                while ((count = reader.Read(buffer, 0, buffer.Length)) > 0) {
                    bytes += Encoding.UTF8.GetByteCount(buffer, 0, count); Require(bytes <= MaximumBytes);
                    result.Append(buffer, 0, count);
                }
                Array.Clear(buffer, 0, buffer.Length); return result.ToString();
            });
        }
        internal static object SealIsolationPriorState(string context, string prior)
        {
            string script = Path.Combine(Installation.Root, "src", "lib", "release", "protected-production-isolation-seal-worker.ps1");
            string powerShell = Path.Combine(Directory.GetParent(Environment.SystemDirectory).FullName, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
            string packet = Json.Serialize(new { context = Json.DeserializeObject(context), priorState = Json.DeserializeObject(prior) });
            Require(Encoding.UTF8.GetByteCount(packet) <= MaximumBytes);
            Process child = null;
            try
            {
                var start = new ProcessStartInfo { FileName = powerShell,
                    Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + script + "\"",
                    WorkingDirectory = Installation.Root, UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true };
                start.EnvironmentVariables.Clear();
                start.EnvironmentVariables["SystemRoot"] = Directory.GetParent(Environment.SystemDirectory).FullName;
                start.EnvironmentVariables["WINDIR"] = start.EnvironmentVariables["SystemRoot"];
                child = Process.Start(start); Require(child != null);
                ProtectedProductionIsolationCore.ContainSealProcess(child);
                var input = child.StandardInput.WriteLineAsync(packet); Require(input.Wait(10000));
                child.StandardInput.Close();
                var output = ReadBoundedAsync(child.StandardOutput); var error = ReadBoundedAsync(child.StandardError);
                Require(child.WaitForExit(20000) && output.Wait(1000) && error.Wait(1000) && child.ExitCode == 0 && error.Result.Length == 0);
                Require(Encoding.UTF8.GetByteCount(output.Result) <= MaximumBytes);
                var receipt = Json.Deserialize<Dictionary<string, object>>(output.Result.Trim()); Require(receipt != null);
                return receipt;
            }
            catch { throw new InvalidOperationException("Production isolation prior state bridge refused"); }
            finally { if (child != null) { try { if (!child.HasExited) child.Kill(); } catch { } child.Dispose(); } }
        }
    }
}