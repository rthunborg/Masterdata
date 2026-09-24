using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace HrMasterdata.Release
{
    // A local integrity primitive, NOT bootstrap admission or an installation
    // attestation. A future trusted launcher must establish its root, complete
    // module inventory and expected hashes independently before calling this.
    public sealed class ProtectedFileLease : IDisposable
    {
        const uint ReadControl = 0x20000;
        const uint ReadAttributes = 0x80;
        const uint GenericRead = 0x80000000;
        const uint OpenExisting = 3;
        const uint BackupSemantics = 0x02000000;
        const uint OpenReparsePoint = 0x00200000;
        const uint DirectoryAttribute = 0x10;
        const uint ReparseAttribute = 0x400;
        const int MutationRights = 0x2 | 0x4 | 0x10 | 0x40 | 0x100 | 0x10000 | 0x40000 | 0x80000 | 0x10000000 | 0x40000000;
        // Creating siblings does not permit replacing an already opened child.
        // Attribute/EA mutation, deletion and ACL/owner changes remain forbidden.
        const int AncestorMutationRights = MutationRights & ~0x6;
        static readonly string CurrentUser = WindowsIdentity.GetCurrent().User.Value;
        const string SystemSid = "S-1-5-18";
        const string AdministratorsSid = "S-1-5-32-544";
        const string TrustedInstallerSid = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464";
        readonly List<IDisposable> handles = new List<IDisposable>();
        bool disposed;

        [StructLayout(LayoutKind.Sequential)]
        struct FileInformation
        {
            public uint Attributes;
            public System.Runtime.InteropServices.ComTypes.FILETIME Creation, Access, Write;
            public uint Volume, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;
        }
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern SafeFileHandle CreateFile(string path, uint access, uint share,
            IntPtr security, uint disposition, uint flags, IntPtr template);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetFileInformationByHandle(SafeFileHandle handle, out FileInformation info);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern uint GetFinalPathNameByHandle(SafeFileHandle handle, StringBuilder path, uint length, uint flags);
        [DllImport("advapi32.dll", SetLastError = true)]
        static extern uint GetSecurityInfo(SafeFileHandle handle, int type, uint information,
            out IntPtr owner, out IntPtr group, out IntPtr dacl, out IntPtr sacl, out IntPtr descriptor);
        [DllImport("advapi32.dll")]
        static extern uint GetSecurityDescriptorLength(IntPtr descriptor);
        [DllImport("kernel32.dll")]
        static extern IntPtr LocalFree(IntPtr memory);

        static void Require(bool condition)
        {
            if (!condition) throw new InvalidOperationException("Protected file lease refused");
        }
        static bool Trusted(string sid, bool volumeRoot)
        {
            return sid == CurrentUser || sid == SystemSid || sid == AdministratorsSid ||
                (volumeRoot && sid == TrustedInstallerSid);
        }

        public static void ValidateDescriptor(RawSecurityDescriptor descriptor, bool ancestor, bool volumeRoot)
        {
            Require(descriptor != null && descriptor.Owner != null &&
                Trusted(descriptor.Owner.Value, volumeRoot) && descriptor.DiscretionaryAcl != null);
            int mask = ancestor ? AncestorMutationRights : MutationRights;
            foreach (GenericAce entry in descriptor.DiscretionaryAcl)
            {
                // Inherit-only rules do not apply to this object. Every child
                // used by the lease is independently opened and checked.
                if ((entry.AceFlags & AceFlags.InheritOnly) != 0) continue;
                CommonAce ace = entry as CommonAce;
                Require(ace != null && !ace.IsCallback);
                if (ace.AceQualifier == AceQualifier.AccessDenied) continue;
                Require(ace.AceQualifier == AceQualifier.AccessAllowed);
                if (!Trusted(ace.SecurityIdentifier.Value, volumeRoot))
                    Require((ace.AccessMask & mask) == 0);
            }
        }

        static RawSecurityDescriptor Security(SafeFileHandle handle)
        {
            IntPtr owner, group, dacl, sacl, descriptor;
            Require(GetSecurityInfo(handle, 1, 5, out owner, out group, out dacl, out sacl, out descriptor) == 0);
            try
            {
                uint length = GetSecurityDescriptorLength(descriptor);
                Require(length > 0 && length <= 65536);
                byte[] bytes = new byte[length];
                Marshal.Copy(descriptor, bytes, 0, bytes.Length);
                return new RawSecurityDescriptor(bytes, 0);
            }
            finally { LocalFree(descriptor); }
        }

        static string Canonical(string value)
        {
            Require(!String.IsNullOrWhiteSpace(value) && value.Length < 240 &&
                value.Length > 2 && Char.IsLetter(value[0]) && value[1] == ':' && value[2] == '\\' &&
                value.IndexOf(':', 2) < 0 && value.IndexOf('/') < 0);
            string full = Path.GetFullPath(value);
            Require(String.Equals(full.TrimEnd('\\'), value.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase));
            foreach (string segment in full.Substring(3).Split('\\'))
                Require(segment.Length == 0 || (!segment.EndsWith(".") && !segment.EndsWith(" ")));
            return full.Length == 3 ? full : full.TrimEnd('\\');
        }

        SafeFileHandle Open(string path, bool directory, bool ancestor)
        {
            // Directories allow unrelated child activity but deny rename/delete.
            // Files allow reads only: no writer or deletion handle can coexist.
            SafeFileHandle handle = CreateFile(path,
                directory ? ReadControl | ReadAttributes : GenericRead | ReadControl,
                directory ? 3u : 1u, IntPtr.Zero, OpenExisting,
                OpenReparsePoint | (directory ? BackupSemantics : 0), IntPtr.Zero);
            Require(!handle.IsInvalid);
            handles.Add(handle);
            FileInformation info;
            Require(GetFileInformationByHandle(handle, out info));
            Require((info.Attributes & ReparseAttribute) == 0 &&
                ((info.Attributes & DirectoryAttribute) != 0) == directory);
            if (!directory) Require(info.Links == 1);
            StringBuilder final = new StringBuilder(32768);
            uint count = GetFinalPathNameByHandle(handle, final, (uint)final.Capacity, 0);
            Require(count > 0 && count < final.Capacity &&
                String.Equals(final.ToString().TrimEnd('\\'), ("\\\\?\\" + path).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase));
            ValidateDescriptor(Security(handle), ancestor, path.Length == 3);
            return handle;
        }

        public static ProtectedFileLease Acquire(string root, IDictionary<string, string> expectedFiles)
        {
            ProtectedFileLease lease = new ProtectedFileLease();
            try
            {
                root = Canonical(root);
                Require(root.Length > 3 && expectedFiles != null && expectedFiles.Count > 0 && expectedFiles.Count <= 512);
                var files = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var entry in expectedFiles)
                {
                    string file = Canonical(entry.Key);
                    Require(file.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase) &&
                        entry.Value != null && System.Text.RegularExpressions.Regex.IsMatch(entry.Value, "\\A[a-f0-9]{64}\\z") &&
                        !files.ContainsKey(file));
                    files.Add(file, entry.Value);
                }
                var directories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (string file in files.Keys)
                {
                    var chain = new Stack<string>();
                    string parent = Path.GetDirectoryName(file);
                    while (parent != null)
                    {
                        chain.Push(parent);
                        parent = Path.GetDirectoryName(parent);
                    }
                    while (chain.Count > 0)
                    {
                        string directory = chain.Pop();
                        if (directories.Add(directory)) lease.Open(directory, true,
                            !String.Equals(directory, root, StringComparison.OrdinalIgnoreCase) &&
                            !directory.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase));
                    }
                    SafeFileHandle handle = lease.Open(file, false, false);
                    FileStream stream = new FileStream(handle, FileAccess.Read);
                    lease.handles.Add(stream);
                    using (SHA256 algorithm = SHA256.Create())
                    {
                        string digest = BitConverter.ToString(algorithm.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
                        Require(digest == files[file]);
                    }
                }
                return lease;
            }
            catch
            {
                lease.Dispose();
                throw new InvalidOperationException("Protected file lease refused");
            }
        }

        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            for (int i = handles.Count - 1; i >= 0; i--) handles[i].Dispose();
            handles.Clear();
        }
    }
}
