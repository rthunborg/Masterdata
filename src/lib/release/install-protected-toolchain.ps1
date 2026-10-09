param(
 [Parameter(Mandatory=$true)][string]$PackageDirectory,
 [Parameter(Mandatory=$true)][string]$ExpectedPackageSha256
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$stage='package-validation'
$compileErrors=@()

# Invoke only this reviewed installer, with the package digest obtained from an
# independent reviewed release record. A digest supplied by an arbitrary caller
# is not approval. Installation grants no private-input or hosted capability.
try {
 if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
 if($ExpectedPackageSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'digest'}
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
 $manifestBytes=Read-BoundedFile (Join-Path $PackageDirectory 'toolchain-package.json') 16384
 if((Hash-Bytes $manifestBytes) -cne $ExpectedPackageSha256){throw 'package'}
 $manifest=[Text.Encoding]::UTF8.GetString($manifestBytes)|ConvertFrom-Json
 if(($manifest.PSObject.Properties.Name|Sort-Object)-join ',' -cne 'files,kind,schemaVersion,sourceCommit,sourceTree' -or
    $manifest.schemaVersion -ne 1 -or $manifest.kind -cne 'offline-protected-toolchain-package' -or
    $manifest.sourceCommit -cnotmatch '^[a-f0-9]{40}$' -or $manifest.sourceTree -cnotmatch '^[a-f0-9]{40}$'){throw 'schema'}
 $expected=@(
  'node_modules/papaparse/package.json','node_modules/papaparse/papaparse.js',
  'runtime/node.exe','runtime/supabase.exe',
  'src/lib/release/protected-bootstrap-host.cs','src/lib/release/protected-bootstrap-worker.mjs',
  'src/lib/release/protected-file-lease.cs',
  'supabase/verify/run-reviewed-supabase-cli.mjs','supabase/verify/verify-production-baseline-catalog.mjs',
  'supabase/verify/verify-target-binding.mjs'
 )
 if(@($manifest.files).Count -ne $expected.Count -or (@($manifest.files|ForEach-Object {$_.path}) -join '|') -cne ($expected -join '|')){throw 'closure'}
 $contents=@{}
 foreach($entry in $manifest.files){
  if(($entry.PSObject.Properties.Name|Sort-Object)-join ',' -cne 'path,sha256' -or $entry.sha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'entry'}
  $bytes=Read-BoundedFile (Join-Path $PackageDirectory $entry.path) 200MB
  if((Hash-Bytes $bytes) -cne $entry.sha256){throw 'file'}
  $contents[$entry.path]=$bytes
 }
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
 $root=Join-Path $profile ('.hr-masterdata-toolchain-'+$ExpectedPackageSha256)
 if(Test-Path -LiteralPath $root){throw 'existing'}
 $null=[IO.Directory]::CreateDirectory($root,$acl)
 foreach($entry in $manifest.files){
  $destination=Join-Path $root $entry.path
  $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
  $stream=[IO.File]::Open($destination,'CreateNew','Write','None')
  try{$bytes=$contents[$entry.path];$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
 }
 $rootLiteral=$root.Replace('"','""')
 $rows=@($manifest.files|ForEach-Object {'{ @"'+$_.path.Replace('/','\')+'", "'+$_.sha256+'" }'}) -join ",`n"
 $plan='namespace HrMasterdata.Release { internal static class Installation { internal const string Root = @"'+$rootLiteral+'"; internal static readonly System.Collections.Generic.Dictionary<string,string> Files = new System.Collections.Generic.Dictionary<string,string> { '+$rows+' }; } }'
 $code=[Text.Encoding]::UTF8.GetString($contents['src/lib/release/protected-file-lease.cs'])
 # Add-Type compiles trusted, digest-verified in-memory bytes. No package path
 # is passed to the compiler. Its executable output is in the new private root.
 $hostCode=[Text.Encoding]::UTF8.GetString($contents['src/lib/release/protected-bootstrap-host.cs'])
 # Separate compilation units preserve each file's using directives.
 $stage='compile'
 $provider=New-Object Microsoft.CSharp.CSharpCodeProvider
 $parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateExecutable=$true;$parameters.GenerateInMemory=$false
 $parameters.OutputAssembly=Join-Path $root 'bootstrap.exe'
 $parameters.CompilerOptions='/optimize+ /platform:x64'
 $null=$parameters.ReferencedAssemblies.Add('System.dll');$null=$parameters.ReferencedAssemblies.Add('System.Core.dll')
 try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]@($code,$hostCode,$plan))}finally{$provider.Dispose()}
 if($compiled.Errors.HasErrors){$compileErrors=@($compiled.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line});throw 'compile'}
 # Verify the installed bytes and ACL chain without starting the installation.
 $stage='installed-lease'
 Add-Type -TypeDefinition $code
 $files=New-Object 'System.Collections.Generic.Dictionary[string,string]'
 foreach($entry in $manifest.files){$files.Add((Join-Path $root $entry.path),$entry.sha256)}
 $exe=Join-Path $root 'bootstrap.exe';$exeHash=Hash-Bytes ([IO.File]::ReadAllBytes($exe));$files.Add($exe,$exeHash)
 $lease=[HrMasterdata.Release.ProtectedFileLease]::Acquire($root,$files)
 $lease.Dispose()
 [ordered]@{installed=$true;packageSha256=$ExpectedPackageSha256;launcherSha256=$exeHash;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
} catch {
 # Retain failed installs for inspection; never overwrite or delete them.
 [ordered]@{installed=$false;stage=$stage;compileErrors=$compileErrors;errorType=$_.Exception.GetType().Name;line=$_.InvocationInfo.ScriptLineNumber;detailsSuppressed=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
 exit 1
}
