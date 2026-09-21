param([Parameter(Mandatory=$true)][string]$SourceFile,[Parameter(Mandatory=$true)][string]$NodeExecutable)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'Windows PowerShell 5.1 required'}
Add-Type -Path $SourceFile
$results=New-Object 'System.Collections.Generic.List[object]'
function Check([string]$Name,[scriptblock]$Body){try{& $Body;$results.Add(@{name=$Name;passed=$true})}catch{$results.Add(@{name=$Name;passed=$false})}}
function Expect-Rejected([scriptblock]$Body){$rejected=$false;try{& $Body}catch{$rejected=$true};if(-not $rejected){throw 'expected refusal'}}
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
function Descriptor([string]$Acl,[string]$Owner=$owner){return New-Object Security.AccessControl.RawSecurityDescriptor("O:$Owner"+'G:SYD:'+$Acl)}
Check 'untrusted-owner' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;FA;;;SY)' 'S-1-1-0'),$false,$false)}}
Check 'untrusted-parent-delete-child' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;0x40;;;WD)'),$true,$false)}}
Check 'untrusted-parent-change-permissions' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;WD;;;WD)'),$true,$false)}}
Check 'untrusted-parent-write-attributes' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;WA;;;WD)'),$true,$false)}}
Check 'untrusted-parent-owner-change' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;WO;;;WD)'),$true,$false)}}
Check 'sibling-creation-is-not-replacement' {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;0x6;;;WD)'),$true,$false)}
Check 'protected-root-rejects-create-child' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;0x6;;;WD)'),$false,$false)}}
Check 'inherited-write-is-rejected' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;ID;FW;;;WD)'),$false,$false)}}
Check 'deny-rule-does-not-hide-allow' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(D;;FW;;;WD)(A;;FW;;;WD)'),$false,$false)}}
Check 'null-dacl-is-rejected' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((New-Object Security.AccessControl.RawSecurityDescriptor("O:$owner"+'G:SY')),$false,$false)}}
$installer='S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464'
Check 'windows-servicing-owner-at-volume-root' {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;FA;;;SY)' $installer),$true,$true)}
Check 'windows-servicing-owner-not-general-exception' {Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor((Descriptor '(A;;FA;;;SY)' $installer),$true,$false)}}
$fixture=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-lease-test-'+[Guid]::NewGuid().ToString('N'))
$null=[IO.Directory]::CreateDirectory($fixture)
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner((New-Object Security.Principal.SecurityIdentifier($owner)))
$acl.SetAccessRuleProtection($true,$false)
foreach($sid in @($owner,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
[IO.Directory]::SetAccessControl($fixture,$acl)
$exe=Join-Path $fixture 'node.exe'
[IO.File]::Copy($NodeExecutable,$exe,$false)
$main=Join-Path $fixture 'main.mjs';$leaf=Join-Path $fixture 'leaf.mjs'
[IO.File]::WriteAllText($leaf,'export const value = "locked-runtime-ok";', (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText($main,'process.stdout.write("ready\n"); process.stdin.once("data", async () => { const {value}=await import("./leaf.mjs"); process.stdout.write(value); process.exit(0); });', (New-Object Text.UTF8Encoding($false)))
$files=New-Object 'System.Collections.Generic.Dictionary[string,string]'
foreach($file in @($exe,$main,$leaf)){$files.Add($file,(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant())}
Check 'hash-mismatch-rejected' {$bad=New-Object 'System.Collections.Generic.Dictionary[string,string]';$bad.Add($main,('0'*64));Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$bad);$l.Dispose()}}
Check 'escaped-path-rejected' {$bad=New-Object 'System.Collections.Generic.Dictionary[string,string]';$bad.Add($NodeExecutable,$files[$exe]);Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$bad);$l.Dispose()}}
Check 'preexisting-writer-rejected' {$writer=[IO.File]::Open($leaf,'Open','Write','ReadWrite,Delete');try{Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$files);$l.Dispose()}}finally{$writer.Dispose()}}
$lease=$null;$child=$null
try{
 $lease=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$files)
 Check 'file-write-blocked' {Expect-Rejected {$s=[IO.File]::Open($leaf,'Open','Write','ReadWrite');$s.Dispose()}}
 Check 'file-rename-blocked' {Expect-Rejected {[IO.File]::Move($leaf,(Join-Path $fixture 'renamed.mjs'))}}
 Check 'file-delete-blocked' {Expect-Rejected {[IO.File]::Delete($leaf)}}
 Check 'directory-rename-blocked' {Expect-Rejected {[IO.Directory]::Move($fixture,($fixture+'-moved'))}}
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=$exe;$info.Arguments='"'+$main+'"';$info.WorkingDirectory=$fixture
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear()
 foreach($key in @('SystemRoot','WINDIR','TEMP','TMP')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info
 if(-not $child.Start()){throw 'child_start'}
 $ready=$child.StandardOutput.ReadLineAsync();if(-not $ready.Wait(10000) -or $ready.Result -ne 'ready'){throw 'child_ready'}
 Check 'executable-write-blocked-during-launch' {Expect-Rejected {$s=[IO.File]::Open($exe,'Open','Write','ReadWrite');$s.Dispose()}}
 Check 'module-replacement-blocked-before-import' {Expect-Rejected {[IO.File]::Move($leaf,(Join-Path $fixture 'replaced.mjs'))}}
 $child.StandardInput.WriteLine('continue');$child.StandardInput.Close()
 if(-not $child.WaitForExit(10000)){throw 'child_timeout'}
 Check 'locked-node-and-module-launch-succeeds' {if($child.ExitCode -ne 0 -or $child.StandardOutput.ReadToEnd() -ne 'locked-runtime-ok'){throw 'child_result'}}
}finally{if($null -ne $child){if(-not $child.HasExited){$child.Kill();$child.WaitForExit()};$child.Dispose()};if($null -ne $lease){$lease.Dispose()}}
Check 'dispose-releases-file-lock' {$s=[IO.File]::Open($leaf,'Open','Write','Read');$s.Dispose()}
Check 'junction-is-rejected' {
 $real=Join-Path $fixture 'real';$null=[IO.Directory]::CreateDirectory($real)
 $target=Join-Path $real 'target.mjs';[IO.File]::WriteAllText($target,'synthetic')
 $junction=Join-Path $fixture 'junction';$null=New-Item -ItemType Junction -Path $junction -Target $real
 $bad=New-Object 'System.Collections.Generic.Dictionary[string,string]';$bad.Add((Join-Path $junction 'target.mjs'),(Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant())
 Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$bad);$l.Dispose()}
}
Check 'hardlink-is-rejected' {
 $linked=Join-Path $fixture 'hardlink.mjs';$null=New-Item -ItemType HardLink -Path $linked -Target $leaf
 $bad=New-Object 'System.Collections.Generic.Dictionary[string,string]';$bad.Add($linked,(Get-FileHash -LiteralPath $linked).Hash.ToLowerInvariant())
 Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$bad);$l.Dispose()}
}
Check 'live-file-untrusted-write-is-rejected' {
 $unsafeFile=Join-Path $fixture 'unsafe.mjs';[IO.File]::WriteAllText($unsafeFile,'synthetic')
 $fileAcl=[IO.File]::GetAccessControl($unsafeFile)
 $fileAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier('S-1-1-0')),'Write','Allow')))
 [IO.File]::SetAccessControl($unsafeFile,$fileAcl)
 $bad=New-Object 'System.Collections.Generic.Dictionary[string,string]';$bad.Add($unsafeFile,(Get-FileHash -LiteralPath $unsafeFile).Hash.ToLowerInvariant())
 Expect-Rejected {$l=[HrMasterdata.Release.ProtectedFileLease]::Acquire($fixture,$bad);$l.Dispose()}
}
# Saved synthetic fixtures are retained. No system or unrelated ACL is modified.
[ordered]@{cases=@($results.ToArray());syntheticOnly=$true;fixtureRetained=$true;hostedAccess=$false}|ConvertTo-Json -Depth 5 -Compress
if(@($results|Where-Object {-not $_.passed}).Count -ne 0){exit 1}
