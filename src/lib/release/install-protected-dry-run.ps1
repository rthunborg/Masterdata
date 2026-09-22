param(
 [Parameter(Mandatory=$true)][string]$PackageDirectory,
 [Parameter(Mandatory=$true)][string]$ExpectedPackageSha256,
 [Parameter(Mandatory=$true)][string]$ApprovedProductionLinkPath,
 [Parameter(Mandatory=$true)][string]$ExpectedProductionLinkSha256
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$stage='package-validation'
$compileErrors=@()

# Invoke only this reviewed installer, with the package digest obtained from an
# independent reviewed release record. A digest supplied by an arbitrary caller
# is not approval. The independently established production link is supplied
# from the private reviewed tooling record, never derived from encrypted inputs.
# Installation itself never loads credentials, connects, or runs the launcher.
try {
 if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
 if($ExpectedPackageSha256 -cnotmatch '^[a-f0-9]{64}$' -or $ExpectedProductionLinkSha256 -cnotmatch '^[a-f0-9]{64}$' -or -not [IO.Path]::IsPathRooted($ApprovedProductionLinkPath)){throw 'digest'}
 function Hash-Bytes([byte[]]$Bytes){$h=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($h.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
 function Read-BoundedFile([string]$Path,[int]$Maximum){
  $full=[IO.Path]::GetFullPath($Path)
  $item=$full
  while($null -ne $item){
   if(([IO.File]::GetAttributes($item) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'reparse'}
   $item=[IO.Path]::GetDirectoryName($item)
  }
  $stream=[IO.File]::Open($full,'Open','Read','Read')
  try{
   if($stream.Length -gt $Maximum){throw 'size'}
   $bytes=New-Object byte[] ([int]$stream.Length)
   $offset=0
   while($offset -lt $bytes.Length){$n=$stream.Read($bytes,$offset,$bytes.Length-$offset);if($n -eq 0){throw 'read'};$offset+=$n}
   return ,$bytes
  }finally{$stream.Dispose()}
 }
 $manifestBytes=Read-BoundedFile (Join-Path $PackageDirectory 'toolchain-package.json') 65536
 if((Hash-Bytes $manifestBytes) -cne $ExpectedPackageSha256){throw 'package'}
 $manifest=[Text.Encoding]::UTF8.GetString($manifestBytes)|ConvertFrom-Json
 if(($manifest.PSObject.Properties.Name|Sort-Object)-join ',' -cne 'approvalAttested,executable,files,kind,plan,privateMaterialAllowed,schemaVersion,sourceCommit,sourceManifestSha256,sourceTree' -or
    $manifest.schemaVersion -ne 1 -or $manifest.kind -cne 'offline-protected-dry-run-package' -or
    $manifest.executable -cne $false -or $manifest.privateMaterialAllowed -cne $false -or $manifest.approvalAttested -cne $false -or
    $manifest.sourceManifestSha256 -cnotmatch '^[a-f0-9]{64}$' -or
    $manifest.sourceCommit -cnotmatch '^[a-f0-9]{40}$' -or $manifest.sourceTree -cnotmatch '^[a-f0-9]{40}$'){throw 'schema'}
 if($manifest.executable -isnot [bool] -or $manifest.privateMaterialAllowed -isnot [bool] -or $manifest.approvalAttested -isnot [bool] -or $manifest.schemaVersion -isnot [int]){throw 'schema-types'}
 $versions=@('20260314000001','20260314000002','20260614000000','20260615000000','20260709194903','20260710144000','20260710150000','20260831200026','20260909115242','20260910094517','20260910115024','20260910184840','20260910184841')
 if(@($manifest.plan).Count -ne 13 -or (@($manifest.plan|ForEach-Object {$_.version}) -join '|') -cne ($versions -join '|')){throw 'plan'}
 foreach($entry in $manifest.plan){if(($entry.PSObject.Properties.Name|Sort-Object)-join ',' -cne 'file,gitBlob,sha256,version' -or $entry.file -cnotmatch ('^'+$entry.version+'_[a-z0-9_]+\.sql$') -or $entry.gitBlob -cnotmatch '^[a-f0-9]{40}$' -or $entry.sha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'plan-entry'}}
 $expected=@(
  'runtime/node.exe','runtime/supabase.exe',
  'src/lib/release/protected-file-lease.cs',
  'src/lib/release/protected-dry-run-host.cs','src/lib/release/protected-dry-run-worker.mjs',
  'src/lib/release/protected-production-inputs.cs','src/lib/release/production-bootstrap-admission.mjs',
  'supabase/verify/run-reviewed-supabase-cli.mjs','supabase/verify/verify-production-baseline-catalog.mjs',
  'supabase/verify/verify-target-binding.mjs',
  'node_modules/papaparse/package.json','node_modules/papaparse/papaparse.js','supabase/migration-baseline-manifest.json'
 ) + @($manifest.plan|ForEach-Object {'supabase/migrations/'+$_.file})
 if(@($manifest.files).Count -ne $expected.Count -or (@($manifest.files|ForEach-Object {$_.path}) -join '|') -cne ($expected -join '|')){throw 'closure'}
 $packageRoot=[IO.Path]::GetFullPath($PackageDirectory).TrimEnd('\')
 $allowedPackageFiles=@($expected)+@('toolchain-package.json')
 function Check-PackageDirectory([string]$Directory){
  foreach($entryPath in [IO.Directory]::GetFileSystemEntries($Directory)){
   $attributes=[IO.File]::GetAttributes($entryPath)
   if(($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'package-reparse'}
   $relative=$entryPath.Substring($packageRoot.Length+1).Replace('\','/')
   if(($attributes -band [IO.FileAttributes]::Directory) -ne 0){
    if(@($allowedPackageFiles|Where-Object {$_.StartsWith($relative+'/',[StringComparison]::Ordinal)}).Count -eq 0){throw 'package-extra-directory'}
    Check-PackageDirectory $entryPath
   }elseif($relative -cnotin $allowedPackageFiles){throw 'package-extra-file'}
  }
 }
 Check-PackageDirectory $packageRoot
 $contents=@{}
 foreach($entry in $manifest.files){
  if(($entry.PSObject.Properties.Name|Sort-Object)-join ',' -cne 'path,sha256' -or $entry.sha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'entry'}
  $bytes=Read-BoundedFile (Join-Path $PackageDirectory $entry.path) 200MB
  if((Hash-Bytes $bytes) -cne $entry.sha256){throw 'file'}
  $contents[$entry.path]=$bytes
 }
 foreach($entry in $manifest.plan){
  $bytes=$contents['supabase/migrations/'+$entry.file]
  if((Hash-Bytes $bytes) -cne $entry.sha256){throw 'migration'}
  $sha1=[Security.Cryptography.SHA1]::Create()
  try{$prefix=[Text.Encoding]::ASCII.GetBytes(('blob '+$bytes.Length+[char]0));$blobHash=([BitConverter]::ToString($sha1.ComputeHash([byte[]]($prefix+$bytes)))).Replace('-','').ToLowerInvariant()}finally{$sha1.Dispose()}
  if($blobHash -cne $entry.gitBlob){throw 'migration-blob'}
 }
 if((Hash-Bytes $contents['supabase/migration-baseline-manifest.json']) -cne $manifest.sourceManifestSha256){throw 'baseline'}
 # Create with its DACL atomically. Never repair ACLs of an existing directory,
 # overwrite an installation, or execute code from the mutable package path.
 $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl=New-Object Security.AccessControl.DirectorySecurity
 $acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
 }
 $stage='materialize'
 $profile=[Environment]::GetFolderPath('UserProfile')
 $root=Join-Path $profile ('.hr-masterdata-toolchain-dryrun-'+$ExpectedPackageSha256)
 if(Test-Path -LiteralPath $root){throw 'existing'}
 $null=[IO.Directory]::CreateDirectory($root,$acl)
 foreach($entry in $manifest.files){
  $destination=Join-Path $root $entry.path
  $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
  $stream=[IO.File]::Open($destination,'CreateNew','Write','None')
  try{$bytes=$contents[$entry.path];$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
 }
 [IO.File]::WriteAllBytes((Join-Path $root 'toolchain-package.json'),$manifestBytes)
 $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider(2048)
 $rsa.PersistKeyInCsp=$false
 try{$privateKey=$rsa.ToXmlString($true);$public=$rsa.ExportParameters($false)}finally{$rsa.Dispose()}
 function Base64Url([byte[]]$Bytes){return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
 $publicBytes=[Text.Encoding]::UTF8.GetBytes(([ordered]@{kty='RSA';n=(Base64Url $public.Modulus);e=(Base64Url $public.Exponent)}|ConvertTo-Json -Compress))
 [IO.File]::WriteAllBytes((Join-Path $root 'bootstrap-origin.json'),$publicBytes)
 $allFiles=@($manifest.files)+@([pscustomobject]@{path='toolchain-package.json';sha256=$ExpectedPackageSha256},[pscustomobject]@{path='bootstrap-origin.json';sha256=(Hash-Bytes $publicBytes)})
 $rows=@($allFiles|ForEach-Object {'{ @"'+$_.path.Replace('/','\')+'", "'+$_.sha256+'" }'}) -join ",`n"
 $inputRoot=Join-Path $profile '.hr-masterdata-private'
 $plan='namespace HrMasterdata.Release { internal static class Installation { internal const string Root = @"'+$root.Replace('"','""')+'"; internal const string InputRoot = @"'+$inputRoot.Replace('"','""')+'"; internal const string LinkPath = @"'+$ApprovedProductionLinkPath.Replace('"','""')+'"; internal const string LinkSha256 = "'+$ExpectedProductionLinkSha256+'"; internal const string OriginPrivateKey = @"'+$privateKey.Replace('"','""')+'"; internal static readonly System.Collections.Generic.Dictionary<string,string> Files = new System.Collections.Generic.Dictionary<string,string> { '+$rows+' }; } }'
 $code=[Text.Encoding]::UTF8.GetString($contents['src/lib/release/protected-file-lease.cs'])
 # Add-Type compiles trusted, digest-verified in-memory bytes. No package path
 # is passed to the compiler. Its executable output is in the new private root.
 $hostCode=[Text.Encoding]::UTF8.GetString($contents['src/lib/release/protected-dry-run-host.cs'])
 $inputsCode=[Text.Encoding]::UTF8.GetString($contents['src/lib/release/protected-production-inputs.cs'])
 # Separate compilation units preserve each file's using directives.
 $stage='compile'
 $provider=New-Object Microsoft.CSharp.CSharpCodeProvider
 $parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateExecutable=$true;$parameters.GenerateInMemory=$false
 $parameters.OutputAssembly=Join-Path $root 'dry-run.exe'
 $parameters.CompilerOptions='/optimize+ /platform:x64'
 $null=$parameters.ReferencedAssemblies.Add('System.dll');$null=$parameters.ReferencedAssemblies.Add('System.Core.dll')
 $null=$parameters.ReferencedAssemblies.Add('System.Security.dll');$null=$parameters.ReferencedAssemblies.Add('System.Web.Extensions.dll')
 try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]@($code,$hostCode,$inputsCode,$plan))}finally{$provider.Dispose();$privateKey=$null;$plan=$null}
 if($compiled.Errors.HasErrors){$compileErrors=@($compiled.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line});throw 'compile'}
 # Verify the installed bytes and ACL chain without starting the installation.
 $stage='installed-lease'
 Add-Type -TypeDefinition $code
 $files=New-Object 'System.Collections.Generic.Dictionary[string,string]'
 foreach($entry in $allFiles){$files.Add((Join-Path $root $entry.path),$entry.sha256)}
 $exe=Join-Path $root 'dry-run.exe';$exeHash=Hash-Bytes ([IO.File]::ReadAllBytes($exe));$files.Add($exe,$exeHash)
 $lease=[HrMasterdata.Release.ProtectedFileLease]::Acquire($root,$files)
 $lease.Dispose()
 [ordered]@{installed=$true;packageSha256=$ExpectedPackageSha256;launcherSha256=$exeHash;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
} catch {
 # Retain failed installs for inspection; never overwrite or delete them.
 [ordered]@{installed=$false;stage=$stage;compileErrors=$compileErrors;errorType=$_.Exception.GetType().Name;line=$_.InvocationInfo.ScriptLineNumber;detailsSuppressed=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
 exit 1
}
