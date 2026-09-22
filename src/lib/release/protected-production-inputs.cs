using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace HrMasterdata.Release
{
    // This loader is a local private-input primitive. The protected host supplies
    // its fixed root; callers cannot select a root, target, CLI, or operation.
    // Certificate handling is limited to the captured fixed path, hash, and
    // metadata; the reviewed wrapper performs certificate trust verification.
    // Loading inputs is not target binding, authority, or permission to write.
    internal sealed class ProductionInputs : IDisposable
    {
        const int MaxRecordBytes = 65536;
        const int MaxBlobBytes = 1024 * 1024;
        const int MaxCertificateBytes = 65536;
        const string EntropyLabel = "hr-masterdata/production/private-inputs/v1";
        const string GenericFailure = "Protected production inputs refused";
        static readonly string[] PayloadKeys = new string[] {
            "schemaVersion", "environment", "EXPECTED_SUPABASE_ENVIRONMENT",
            "SUPABASE_DB_CONNECTION_MODE", "projectRef", "databasePassword",
            "EXPECTED_SUPABASE_POOLER_HOST", "sslMode", "source",
            "ownerConfirmedProduction", "certificateSource", "recordedAtUtc",
            "SUPABASE_SSL_ROOT_CERT", "EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256"
        };
        static readonly string[] RecordKeys = new string[] {
            "schemaVersion", "purpose", "environment", "protectionScope",
            "entropyLabel", "fieldsPresent", "encryptedBlobPath",
            "encryptedBlobSHA256", "selfTestPassed", "aclRestricted",
            "recordedAtUtc", "ownerConfirmedProduction", "targetBindingVerified",
            "liveProductionTlsVerified", "passwordAuthenticationTested",
            "hostedConnectionAttempted", "releaseVerificationRequired"
        };
        static readonly string[] CertificateRecordKeys = new string[] {
            "schemaVersion", "purpose", "environment", "provenance",
            "operatorConfirmedSource", "certificatePath", "certificateSHA256",
            "certificateAuthority", "containsPrivateKey", "notBeforeUtc",
            "notAfterUtc", "recordedAtUtc", "aclRestricted",
            "liveProductionTlsVerified", "releaseVerificationRequired"
        };

        readonly ProtectedFileLease lease;
        bool disposed;

        public IDictionary<string, string> EnvironmentValues { get; private set; }

        ProductionInputs(IDictionary<string, string> environmentValues, ProtectedFileLease inputLease)
        {
            EnvironmentValues = new ReadOnlyDictionary<string, string>(
                new Dictionary<string, string>(environmentValues, StringComparer.Ordinal));
            lease = inputLease;
        }

        static void Require(bool value)
        {
            if (!value) throw new InvalidOperationException(GenericFailure);
        }

        static string Hash(byte[] bytes)
        {
            using (SHA256 algorithm = SHA256.Create())
            {
                return BitConverter.ToString(algorithm.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();
            }
        }

        static void Clear(byte[] bytes)
        {
            if (bytes != null) Array.Clear(bytes, 0, bytes.Length);
        }

        static string FixedChild(string root, params string[] parts)
        {
            Require(!String.IsNullOrWhiteSpace(root));
            string fullRoot = Path.GetFullPath(root).TrimEnd('\\');
            Require(fullRoot.Length > 3);
            string candidate = fullRoot;
            foreach (string part in parts)
            {
                Require(!String.IsNullOrEmpty(part) && part.IndexOfAny(new char[] { '\\', '/', ':' }) < 0);
                candidate = Path.Combine(candidate, part);
            }
            candidate = Path.GetFullPath(candidate);
            Require(candidate.StartsWith(fullRoot + "\\", StringComparison.OrdinalIgnoreCase));
            return candidate;
        }

        static byte[] ReadBounded(string file, int maximum)
        {
            FileInfo info = new FileInfo(file);
            Require(info.Exists && info.Length >= 0 && info.Length <= maximum);
            Require((File.GetAttributes(file) & FileAttributes.ReparsePoint) == 0);
            using (FileStream stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                Require(stream.Length == info.Length && stream.Length <= maximum);
                byte[] result = new byte[(int)stream.Length];
                int offset = 0;
                while (offset < result.Length)
                {
                    int read = stream.Read(result, offset, result.Length - offset);
                    Require(read > 0);
                    offset += read;
                }
                Require(stream.ReadByte() == -1);
                return result;
            }
        }

        static void SameHash(byte[] left, byte[] right)
        {
            Require(String.Equals(Hash(left), Hash(right), StringComparison.Ordinal));
        }

        static void SkipWhitespace(string text, ref int position)
        {
            while (position < text.Length && (text[position] == ' ' || text[position] == '\t' || text[position] == '\r' || text[position] == '\n')) position++;
        }

        // JavaScriptSerializer accepts duplicate object names. Reject them
        // independently before deserializing so a later value cannot hide one.
        static void AssertNoDuplicateJsonKeys(byte[] bytes)
        {
            string text = new UTF8Encoding(false, true).GetString(bytes);
            int position = 0;
            ParseJsonValue(text, ref position, 0);
            SkipWhitespace(text, ref position);
            Require(position == text.Length);
        }

        static void ParseJsonValue(string text, ref int position, int depth)
        {
            Require(depth <= 32);
            SkipWhitespace(text, ref position);
            Require(position < text.Length);
            char current = text[position];
            if (current == '{') { ParseJsonObject(text, ref position, depth + 1); return; }
            if (current == '[') { ParseJsonArray(text, ref position, depth + 1); return; }
            if (current == '"') { ParseJsonString(text, ref position); return; }
            if (current == 't') { ParseLiteral(text, ref position, "true"); return; }
            if (current == 'f') { ParseLiteral(text, ref position, "false"); return; }
            if (current == 'n') { ParseLiteral(text, ref position, "null"); return; }
            ParseJsonNumber(text, ref position);
        }

        static void ParseLiteral(string text, ref int position, string literal)
        {
            Require(position + literal.Length <= text.Length &&
                String.CompareOrdinal(text, position, literal, 0, literal.Length) == 0);
            position += literal.Length;
        }

        static string ParseJsonString(string text, ref int position)
        {
            Require(position < text.Length && text[position++] == '"');
            StringBuilder value = new StringBuilder();
            while (position < text.Length)
            {
                char current = text[position++];
                if (current == '"') return value.ToString();
                Require(current >= 0x20);
                if (current != '\\') { value.Append(current); continue; }
                Require(position < text.Length);
                char escaped = text[position++];
                if (escaped == '"' || escaped == '\\' || escaped == '/') value.Append(escaped);
                else if (escaped == 'b') value.Append('\b');
                else if (escaped == 'f') value.Append('\f');
                else if (escaped == 'n') value.Append('\n');
                else if (escaped == 'r') value.Append('\r');
                else if (escaped == 't') value.Append('\t');
                else if (escaped == 'u')
                {
                    Require(position + 4 <= text.Length);
                    string hex = text.Substring(position, 4);
                    int code;
                    Require(Int32.TryParse(hex, NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out code));
                    value.Append((char)code);
                    position += 4;
                }
                else Require(false);
            }
            Require(false);
            return "";
        }

        static void ParseJsonNumber(string text, ref int position)
        {
            int start = position;
            if (text[position] == '-') position++;
            Require(position < text.Length);
            if (text[position] == '0') position++;
            else
            {
                Require(text[position] >= '1' && text[position] <= '9');
                while (position < text.Length && text[position] >= '0' && text[position] <= '9') position++;
            }
            if (position < text.Length && text[position] == '.')
            {
                position++;
                int digits = position;
                while (position < text.Length && text[position] >= '0' && text[position] <= '9') position++;
                Require(position > digits);
            }
            if (position < text.Length && (text[position] == 'e' || text[position] == 'E'))
            {
                position++;
                if (position < text.Length && (text[position] == '+' || text[position] == '-')) position++;
                int digits = position;
                while (position < text.Length && text[position] >= '0' && text[position] <= '9') position++;
                Require(position > digits);
            }
            Require(position > start);
        }

        static void ParseJsonObject(string text, ref int position, int depth)
        {
            Require(text[position++] == '{');
            SkipWhitespace(text, ref position);
            HashSet<string> keys = new HashSet<string>(StringComparer.Ordinal);
            if (position < text.Length && text[position] == '}') { position++; return; }
            while (true)
            {
                SkipWhitespace(text, ref position);
                string key = ParseJsonString(text, ref position);
                Require(keys.Add(key));
                SkipWhitespace(text, ref position);
                Require(position < text.Length && text[position++] == ':');
                ParseJsonValue(text, ref position, depth);
                SkipWhitespace(text, ref position);
                Require(position < text.Length);
                if (text[position] == '}') { position++; return; }
                Require(text[position++] == ',');
            }
        }

        static void ParseJsonArray(string text, ref int position, int depth)
        {
            Require(text[position++] == '[');
            SkipWhitespace(text, ref position);
            if (position < text.Length && text[position] == ']') { position++; return; }
            while (true)
            {
                ParseJsonValue(text, ref position, depth);
                SkipWhitespace(text, ref position);
                Require(position < text.Length);
                if (text[position] == ']') { position++; return; }
                Require(text[position++] == ',');
            }
        }

        static Dictionary<string, object> ParseObject(byte[] bytes)
        {
            AssertNoDuplicateJsonKeys(bytes);
            string text = new UTF8Encoding(false, true).GetString(bytes);
            var serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = MaxBlobBytes;
            serializer.RecursionLimit = 32;
            object parsed = serializer.DeserializeObject(text);
            var result = parsed as Dictionary<string, object>;
            Require(result != null);
            return result;
        }

        static void ExactKeys(Dictionary<string, object> value, string[] expected)
        {
            Require(value != null && value.Count == expected.Length);
            foreach (string key in expected) Require(value.ContainsKey(key));
        }

        static string StringValue(Dictionary<string, object> value, string key)
        {
            object raw;
            Require(value.TryGetValue(key, out raw));
            string result = raw as string;
            Require(result != null);
            return result;
        }

        static bool BooleanValue(Dictionary<string, object> value, string key)
        {
            object raw;
            Require(value.TryGetValue(key, out raw) && raw is bool);
            return (bool)raw;
        }

        static int IntegerValue(Dictionary<string, object> value, string key)
        {
            object raw;
            Require(value.TryGetValue(key, out raw) && raw is int);
            return (int)raw;
        }

        static void Timestamp(string value)
        {
            DateTime parsed;
            Require(DateTime.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out parsed));
        }

        static void Sha256(string value)
        {
            Require(Regex.IsMatch(value ?? "", "\\A[a-f0-9]{64}\\z"));
        }

        static void FixedPath(string actual, string expected)
        {
            Require(String.Equals(Path.GetFullPath(actual), expected, StringComparison.OrdinalIgnoreCase));
        }

        static void ValidateFieldsPresent(Dictionary<string, object> record)
        {
            object raw = record["fieldsPresent"];
            IList fields = raw as IList;
            Require(fields != null && fields.Count == PayloadKeys.Length);
            for (int index = 0; index < PayloadKeys.Length; index++)
            {
                Require(fields[index] is string && String.Equals((string)fields[index], PayloadKeys[index], StringComparison.Ordinal));
            }
        }

        static void ValidateRecord(Dictionary<string, object> record, string blobPath, byte[] blob)
        {
            ExactKeys(record, RecordKeys);
            Require(IntegerValue(record, "schemaVersion") == 1);
            Require(StringValue(record, "purpose") == "Production inputs captured locally for reviewed release tooling");
            Require(StringValue(record, "environment") == "production");
            Require(StringValue(record, "protectionScope") == "DPAPI CurrentUser");
            Require(StringValue(record, "entropyLabel") == EntropyLabel);
            ValidateFieldsPresent(record);
            FixedPath(StringValue(record, "encryptedBlobPath"), blobPath);
            Require(String.Equals(StringValue(record, "encryptedBlobSHA256"), Hash(blob), StringComparison.Ordinal));
            Require(BooleanValue(record, "selfTestPassed") && BooleanValue(record, "aclRestricted"));
            Timestamp(StringValue(record, "recordedAtUtc"));
            Require(BooleanValue(record, "ownerConfirmedProduction"));
            Require(!BooleanValue(record, "targetBindingVerified") && !BooleanValue(record, "liveProductionTlsVerified"));
            Require(!BooleanValue(record, "passwordAuthenticationTested") && !BooleanValue(record, "hostedConnectionAttempted"));
            Require(BooleanValue(record, "releaseVerificationRequired"));
        }

        static void ValidateCertificateRecord(Dictionary<string, object> record, string certificatePath, byte[] certificate)
        {
            ExactKeys(record, CertificateRecordKeys);
            Require(IntegerValue(record, "schemaVersion") == 1);
            Require(StringValue(record, "purpose") == "Production TLS root certificate");
            Require(StringValue(record, "environment") == "production");
            Require(StringValue(record, "provenance") == "Owner-confirmed fresh production project dashboard download; identity is retained only inside the encrypted input");
            Require(BooleanValue(record, "operatorConfirmedSource"));
            FixedPath(StringValue(record, "certificatePath"), certificatePath);
            Require(String.Equals(StringValue(record, "certificateSHA256"), Hash(certificate), StringComparison.Ordinal));
            Require(BooleanValue(record, "certificateAuthority") && !BooleanValue(record, "containsPrivateKey"));
            Timestamp(StringValue(record, "notBeforeUtc"));
            Timestamp(StringValue(record, "notAfterUtc"));
            Timestamp(StringValue(record, "recordedAtUtc"));
            Require(BooleanValue(record, "aclRestricted") && !BooleanValue(record, "liveProductionTlsVerified"));
            Require(BooleanValue(record, "releaseVerificationRequired"));
        }

        static IDictionary<string, string> ValidatePayload(Dictionary<string, object> payload, string certificatePath, byte[] certificate)
        {
            ExactKeys(payload, PayloadKeys);
            Require(IntegerValue(payload, "schemaVersion") == 1);
            Require(StringValue(payload, "environment") == "production");
            Require(StringValue(payload, "EXPECTED_SUPABASE_ENVIRONMENT") == "production");
            Require(StringValue(payload, "SUPABASE_DB_CONNECTION_MODE") == "session-pooler");
            string projectRef = StringValue(payload, "projectRef");
            string password = StringValue(payload, "databasePassword");
            string host = StringValue(payload, "EXPECTED_SUPABASE_POOLER_HOST");
            Require(Regex.IsMatch(projectRef, "\\A[a-z0-9]{20}\\z"));
            Require(password.Length > 0 && password.Length <= 8192 && password.IndexOf('\0') < 0 &&
                password.IndexOf('\r') < 0 && password.IndexOf('\n') < 0 &&
                !Regex.IsMatch(password, "(?i)\\A\\[?YOUR[- _]?PASSWORD\\]?\\z"));
            Require(Regex.IsMatch(host, "\\Aaws-[a-z0-9]+(?:-[a-z0-9]+)*\\.pooler\\.supabase\\.com\\z"));
            Require(StringValue(payload, "sslMode") == "verify-full");
            Require(StringValue(payload, "source") == "Owner-entered production dashboard project ID and Session pooler template");
            Require(BooleanValue(payload, "ownerConfirmedProduction"));
            Require(StringValue(payload, "certificateSource") == "Owner-confirmed fresh download from the same production project Database Settings SSL Configuration");
            Timestamp(StringValue(payload, "recordedAtUtc"));
            FixedPath(StringValue(payload, "SUPABASE_SSL_ROOT_CERT"), certificatePath);
            string certificateHash = StringValue(payload, "EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256");
            Sha256(certificateHash);
            Require(String.Equals(certificateHash, Hash(certificate), StringComparison.Ordinal));
            string url = "postgresql://postgres." + projectRef + ":" + Uri.EscapeDataString(password) + "@" + host + ":5432/postgres?sslmode=verify-full";
            return new Dictionary<string, string>(StringComparer.Ordinal) {
                { "EXPECTED_SUPABASE_ENVIRONMENT", "production" },
                { "EXPECTED_SUPABASE_PROJECT_REF", projectRef },
                { "SUPABASE_DB_CONNECTION_MODE", "session-pooler" },
                { "EXPECTED_SUPABASE_POOLER_HOST", host },
                { "SUPABASE_DB_URL", url },
                { "SUPABASE_SSL_ROOT_CERT", certificatePath },
                { "EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256", certificateHash }
            };
        }

        public static ProductionInputs Load(string fixedPrivateRoot)
        {
            ProtectedFileLease inputLease = null;
            byte[] recordBefore = null, blobBefore = null, certificateBefore = null, certificateRecordBefore = null;
            byte[] record = null, blob = null, certificate = null, certificateRecord = null, plaintext = null;
            try
            {
                string blobPath = FixedChild(fixedPrivateRoot, "inputs", "production-inputs.v1.dpapi");
                string recordPath = FixedChild(fixedPrivateRoot, "inputs", "production-inputs.v1.record.json");
                string certificatePath = FixedChild(fixedPrivateRoot, "certificates", "production-root-ca.crt");
                string certificateRecordPath = FixedChild(fixedPrivateRoot, "certificates", "production-root-ca-record.json");
                recordBefore = ReadBounded(recordPath, MaxRecordBytes);
                blobBefore = ReadBounded(blobPath, MaxBlobBytes);
                certificateBefore = ReadBounded(certificatePath, MaxCertificateBytes);
                certificateRecordBefore = ReadBounded(certificateRecordPath, MaxRecordBytes);
                var expected = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
                    { recordPath, Hash(recordBefore) }, { blobPath, Hash(blobBefore) },
                    { certificatePath, Hash(certificateBefore) }, { certificateRecordPath, Hash(certificateRecordBefore) }
                };
                inputLease = ProtectedFileLease.Acquire(Path.GetFullPath(fixedPrivateRoot).TrimEnd('\\'), expected);
                record = ReadBounded(recordPath, MaxRecordBytes);
                blob = ReadBounded(blobPath, MaxBlobBytes);
                certificate = ReadBounded(certificatePath, MaxCertificateBytes);
                certificateRecord = ReadBounded(certificateRecordPath, MaxRecordBytes);
                SameHash(recordBefore, record); SameHash(blobBefore, blob);
                SameHash(certificateBefore, certificate); SameHash(certificateRecordBefore, certificateRecord);
                ValidateRecord(ParseObject(record), blobPath, blob);
                ValidateCertificateRecord(ParseObject(certificateRecord), certificatePath, certificate);
                byte[] entropy = new UTF8Encoding(false).GetBytes(EntropyLabel);
                try { plaintext = ProtectedData.Unprotect(blob, entropy, DataProtectionScope.CurrentUser); }
                finally { Clear(entropy); }
                Require(plaintext != null && plaintext.Length > 0 && plaintext.Length <= MaxBlobBytes);
                IDictionary<string, string> environmentValues = ValidatePayload(ParseObject(plaintext), certificatePath, certificate);
                ProductionInputs result = new ProductionInputs(environmentValues, inputLease);
                inputLease = null;
                return result;
            }
            catch
            {
                throw new InvalidOperationException(GenericFailure);
            }
            finally
            {
                if (inputLease != null) inputLease.Dispose();
                Clear(recordBefore); Clear(blobBefore); Clear(certificateBefore); Clear(certificateRecordBefore);
                Clear(record); Clear(blob); Clear(certificate); Clear(certificateRecord); Clear(plaintext);
            }
        }

        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            lease.Dispose();
            // Callers must not retain this property as a post-lease input
            // source. Managed strings are deliberately not claimed zeroized.
            EnvironmentValues = new ReadOnlyDictionary<string, string>(
                new Dictionary<string, string>(StringComparer.Ordinal));
        }
    }
}
