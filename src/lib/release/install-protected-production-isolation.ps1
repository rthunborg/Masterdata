param(
 [Parameter(Mandatory=$true)][string]$PackageDirectory,
 [Parameter(Mandatory=$true)][string]$ExpectedPackageSha256,
 [Parameter(Mandatory=$true)][string]$ApprovedProductionLinkPath,
 [Parameter(Mandatory=$true)][string]$ExpectedProductionLinkSha256,
 [Parameter(Mandatory=$true)][string]$ApprovedIsolationAdmissionPath,
 [Parameter(Mandatory=$true)][string]$ExpectedIsolationAdmissionSha256,
 [Parameter(Mandatory=$true)][string]$ApprovedToolchainRecordPath,
 [Parameter(Mandatory=$true)][string]$ExpectedToolchainSha256
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$stage='package-validation'
$leases=New-Object 'System.Collections.Generic.List[System.IDisposable]'
# The digests must come from the separately reviewed owner admission.
# This installer reads metadata and ciphertext bytes, never decrypts inputs,
# fetches keys, calls a hosted API, starts the worker, or changes hosted settings.
try {
 if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
 function Require([bool]$Value){if(-not $Value){throw 'refused'}}
 function Hash-Bytes([byte[]]$Bytes){$h=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($h.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
 function Read-Bounded([string]$Path,[int]$Maximum){
  Require ([IO.Path]::IsPathRooted($Path))
  $full=[IO.Path]::GetFullPath($Path);$walk=$full
  while($null -ne $walk){Require (([IO.File]::GetAttributes($walk) -band [IO.FileAttributes]::ReparsePoint) -eq 0);$walk=[IO.Path]::GetDirectoryName($walk)}
  $stream=[IO.File]::Open($full,'Open','Read','Read')
  try{Require ($stream.Length -gt 0 -and $stream.Length -le $Maximum);$bytes=New-Object byte[] ([int]$stream.Length);$offset=0
   while($offset -lt $bytes.Length){$n=$stream.Read($bytes,$offset,$bytes.Length-$offset);Require ($n -gt 0);$offset+=$n};return ,$bytes
  }finally{$stream.Dispose()}
 }
 function Exact($Value,[string]$Keys){Require ($null -ne $Value -and (@($Value.PSObject.Properties.Name|Sort-Object)-join ',') -ceq $Keys)}
 function Record([string]$Path,[string]$Digest){
  Require ($Digest -cmatch '^[a-f0-9]{64}$')
  $bytes=Read-Bounded $Path 65536;Require ((Hash-Bytes $bytes) -ceq $Digest)
  return (New-Object Text.UTF8Encoding($false,$true)).GetString($bytes)|ConvertFrom-Json
 }
 function Fixed-Child([string]$Root,[string]$Relative){
  Require ($Relative -cmatch '^[a-zA-Z0-9_@./-]+$' -and -not [IO.Path]::IsPathRooted($Relative) -and $Relative -notmatch '(^|/)\.\.?(/|$)')
  $canonical=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  $child=[IO.Path]::GetFullPath((Join-Path $canonical $Relative))
  Require ($child.StartsWith($canonical+'\',[StringComparison]::OrdinalIgnoreCase));return $child
 }
 function File-Map($Entries,[string]$Root){
  $map=New-Object 'System.Collections.Generic.Dictionary[string,string]' ([StringComparer]::OrdinalIgnoreCase)
  Require (@($Entries).Count -gt 0 -and @($Entries).Count -le 512)
  foreach($entry in $Entries){Exact $entry 'path,sha256';Require ($entry.sha256 -cmatch '^[a-f0-9]{64}$');$child=Fixed-Child $Root $entry.path
   Require (-not $map.ContainsKey($entry.path));Require ((Hash-Bytes (Read-Bounded $child 200MB)) -ceq $entry.sha256);$map.Add($entry.path,$entry.sha256)
  };return ,$map
 }
 foreach($digest in @($ExpectedPackageSha256,$ExpectedProductionLinkSha256,$ExpectedIsolationAdmissionSha256,$ExpectedToolchainSha256)){Require ($digest -cmatch '^[a-f0-9]{64}$')}
 $packageRoot=[IO.Path]::GetFullPath($PackageDirectory)
 $manifestBytes=Read-Bounded (Join-Path $packageRoot 'toolchain-package.json') 65536
 Require ((Hash-Bytes $manifestBytes) -ceq $ExpectedPackageSha256)
 $manifest=(New-Object Text.UTF8Encoding($false,$true)).GetString($manifestBytes)|ConvertFrom-Json
 Exact $manifest 'files,kind,schemaVersion,sourceCommit,sourceManifestSha256,sourceTree'
 Require ($manifest.schemaVersion -eq 1 -and $manifest.kind -ceq 'offline-protected-production-isolation-package' -and $manifest.sourceCommit -cmatch '^[a-f0-9]{40}$' -and $manifest.sourceTree -cmatch '^[a-f0-9]{40}$' -and $manifest.sourceManifestSha256 -cmatch '^[a-f0-9]{64}$')
 $packageFiles=File-Map $manifest.files $packageRoot
 $required=@(
 'runtime/node.exe','src/lib/release/production-isolation-host.ps1','src/lib/release/protected-production-isolation-host.cs',
 'src/lib/release/install-protected-production-isolation.ps1','src/lib/release/prepare-protected-production-isolation-package.mjs',
 'src/lib/release/production-isolation-runtime-import-closure.mjs','src/lib/release/production-isolation.md',
 'src/lib/release/protected-production-isolation-core.cs','src/lib/release/production-isolation-private-runtime.cs',
 'src/lib/release/protected-production-isolation-seal-worker.ps1','src/lib/release/protected-file-lease.cs','src/lib/release/protected-production-inputs.cs',
 'src/lib/release/protected-production-isolation-worker.mjs','src/lib/release/production-isolation-live-adapter.mjs',
 'src/lib/release/production-isolation-module-register.mjs','src/lib/release/production-isolation-module-loader.mjs',
 'src/lib/release/production-isolation-prior-state-seal.ps1','src/lib/release/production-isolation-controls.mjs',
 'src/lib/release/production-isolation-probes.mjs','src/lib/release/collect-production-isolation-database.mjs',
 'src/lib/release/production-platform-config.mjs','src/lib/release/production-isolation-gate.mjs',
 'src/lib/release/production-managed-writer-profiles.mjs','src/lib/release/production-collector-source-binding.mjs',
 'src/lib/release/production-observed-profile.mjs','src/lib/release/prepare-forward-subset.mjs',
 'src/lib/release/production-isolation-statement-trigger-inventory.sql','src/lib/release/production-isolation-database-drain.sql',
 'src/lib/release/run-production-isolation-live.mjs','supabase/verify/verify-production-baseline-catalog.mjs',
 'supabase/verify/verify-target-binding.mjs','supabase/verify/production-baseline-catalog.sql',
 'supabase/verify/production-permission-profile.sql','supabase/verify/production-saved-filter-cleanup-prerequisite.sql',
 'supabase/verify/run-reviewed-supabase-cli.mjs','supabase/migration-baseline-manifest.json','package.json','pnpm-lock.yaml',
 'pnpm-workspace.yaml','src/lib/vendor-patches/exceljs@4.4.0.patch'
 )
 $migrations=@($packageFiles.Keys|Where-Object {$_ -cmatch '^supabase/migrations/[0-9]{14}_[a-z0-9_]+\.sql$'})
 Require ($migrations.Count -eq 69 -and $packageFiles.Count -eq ($required.Count+69))
 foreach($name in $required){Require ($packageFiles.ContainsKey($name))}
 Require ($packageFiles['supabase/migration-baseline-manifest.json'] -ceq $manifest.sourceManifestSha256)
 $admission=Record $ApprovedIsolationAdmissionPath $ExpectedIsolationAdmissionSha256
 Exact $admission 'approvedPackageSha256,egressAdmissionSha256,isolationPlanSha256,kind,managementApiCapabilitySha256,rawModuleSha256,schemaVersion,sourceCommit,sourceManifestSha256,sourceTree,targetBindingSha256,tlsAdmissionSha256,toolchainSha256'
 Require ($admission.schemaVersion -eq 1 -and $admission.kind -ceq 'production-temporary-isolation-admission' -and
  $admission.sourceCommit -ceq $manifest.sourceCommit -and $admission.sourceTree -ceq $manifest.sourceTree -and
  $admission.sourceManifestSha256 -ceq $manifest.sourceManifestSha256 -and $admission.approvedPackageSha256 -ceq $ExpectedPackageSha256 -and
  $admission.rawModuleSha256 -ceq $packageFiles['src/lib/release/protected-production-isolation-worker.mjs'] -and $admission.toolchainSha256 -ceq $ExpectedToolchainSha256)
 foreach($name in @('targetBindingSha256','tlsAdmissionSha256','egressAdmissionSha256','managementApiCapabilitySha256','isolationPlanSha256')){Require ($admission.$name -cmatch '^[a-f0-9]{64}$')}
 $toolchain=Record $ApprovedToolchainRecordPath $ExpectedToolchainSha256
 Exact $toolchain 'cleanSourceRoot,egressAdmissionPath,git,kind,managementApiCapabilityPath,node,privilegedInventoryPath,privilegedInventorySha256,psql,runtimeLeaseSha256,runtimeRecordPath,runtimeRecordSha256,schemaVersion,tlsAdmissionPath'
 Require ($toolchain.schemaVersion -eq 1 -and $toolchain.kind -ceq 'protected-production-isolation-toolchain')
 Exact $toolchain.node 'sha256,version';Require ($toolchain.node.sha256 -ceq $packageFiles['runtime/node.exe'] -and $toolchain.node.version -ceq 'v24.19.0')
 foreach($tool in @($toolchain.git,$toolchain.psql)){Exact $tool 'executable,sha256,version';Require ([IO.Path]::IsPathRooted($tool.executable) -and $tool.sha256 -cmatch '^[a-f0-9]{64}$' -and $tool.version -is [string] -and $tool.version -notmatch '[\r\n"]')}
 Require ($toolchain.psql.version -cmatch '^psql \(PostgreSQL\) [0-9]')
 $sourceRoot=[IO.Path]::GetFullPath($toolchain.cleanSourceRoot)
 $runtimeLease=Record (Join-Path $packageRoot 'runtime-lease-inventory.json') $toolchain.runtimeLeaseSha256
 Exact $runtimeLease 'dependencyPackages,files,kind,nodeExecutableSha256,packageManager,schemaVersion,sourceCommit,sourceManifestSha256,sourceTree'
 Require ($runtimeLease.schemaVersion -eq 1 -and $runtimeLease.kind -ceq 'protected-production-isolation-runtime-lease-inventory' -and
  $runtimeLease.sourceCommit -ceq $manifest.sourceCommit -and $runtimeLease.sourceTree -ceq $manifest.sourceTree -and
  $runtimeLease.sourceManifestSha256 -ceq $manifest.sourceManifestSha256 -and $runtimeLease.nodeExecutableSha256 -ceq $toolchain.node.sha256 -and
  $runtimeLease.packageManager -ceq 'pnpm-hoisted-clean-checkout')
 $runtimeFiles=File-Map $runtimeLease.files $sourceRoot
 foreach($name in $runtimeFiles.Keys){Require ($name.StartsWith('node_modules/',[StringComparison]::Ordinal))}
 $sourceFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]'
 foreach($name in $packageFiles.Keys){if($name -cne 'runtime/node.exe'){Require ((Hash-Bytes (Read-Bounded (Fixed-Child $sourceRoot $name) 200MB)) -ceq $packageFiles[$name]);$sourceFiles.Add($name,$packageFiles[$name])}}
 $profile=[Environment]::GetFolderPath('UserProfile');$privateRoot=Join-Path $profile '.hr-masterdata-private'
 $inventory=Record $toolchain.privilegedInventoryPath $toolchain.privilegedInventorySha256
 Exact $inventory 'files,kind,schemaVersion'
 Require ($inventory.schemaVersion -eq 1 -and $inventory.kind -ceq 'protected-production-isolation-private-lease-inventory')
 $privateFiles=File-Map $inventory.files $privateRoot
 foreach($fixed in @('inputs/production-inputs.v1.dpapi','inputs/production-inputs.v1.record.json','certificates/production-root-ca.crt','certificates/production-root-ca-record.json')){Require ($privateFiles.ContainsKey($fixed))}
 function Require-PrivateRecord([string]$Path,[string]$Digest){
  $full=[IO.Path]::GetFullPath($Path);$prefix=[IO.Path]::GetFullPath($privateRoot).TrimEnd('\')+'\'
  Require ($full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase));$relative=$full.Substring($prefix.Length).Replace('\','/')
  Require ($privateFiles.ContainsKey($relative) -and $privateFiles[$relative] -ceq $Digest)
 }
 # Exclude admission/toolchain/inventory from the inventory itself: their
 # independent approved hashes enter the lease directly, avoiding digest cycles.
 function Add-PrivateRecord([string]$Path,[string]$Digest){
  $full=[IO.Path]::GetFullPath($Path);$prefix=[IO.Path]::GetFullPath($privateRoot).TrimEnd('\')+'\'
  Require ($full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase))
  $relative=$full.Substring($prefix.Length).Replace('\','/')
  Require (-not $privateFiles.ContainsKey($relative) -and (Hash-Bytes (Read-Bounded $full 65536)) -ceq $Digest)
  $privateFiles.Add($relative,$Digest)
 }
 Add-PrivateRecord $ApprovedIsolationAdmissionPath $ExpectedIsolationAdmissionSha256
 Add-PrivateRecord $ApprovedToolchainRecordPath $ExpectedToolchainSha256
 Add-PrivateRecord $toolchain.privilegedInventoryPath $toolchain.privilegedInventorySha256
 Require-PrivateRecord $toolchain.runtimeRecordPath $toolchain.runtimeRecordSha256
 Require-PrivateRecord $toolchain.tlsAdmissionPath $admission.tlsAdmissionSha256
 Require-PrivateRecord $toolchain.egressAdmissionPath $admission.egressAdmissionSha256
 Require-PrivateRecord $toolchain.managementApiCapabilityPath $admission.managementApiCapabilitySha256
 $runtimeRecord=Record $toolchain.runtimeRecordPath $toolchain.runtimeRecordSha256
 Exact $runtimeRecord 'controlAdmission,kind,probeContext,schemaVersion'
 Require ($runtimeRecord.schemaVersion -eq 1 -and $runtimeRecord.kind -ceq 'protected-production-isolation-runtime-record')
 $linkBytes=Read-Bounded $ApprovedProductionLinkPath 65536
 Require ((Hash-Bytes $linkBytes) -ceq $ExpectedProductionLinkSha256)
 $project=(New-Object Text.UTF8Encoding($false,$true)).GetString($linkBytes).Trim()
 Require ($project -cmatch '^[a-z0-9]{20}$' -and (Hash-Bytes ([Text.Encoding]::UTF8.GetBytes('hr-masterdata:production-target:v1:'+$project))) -ceq $admission.targetBindingSha256)
 $cleanLink=Join-Path $sourceRoot 'supabase/.temp/project-ref'
 Require ((Hash-Bytes (Read-Bounded $cleanLink 65536)) -ceq $ExpectedProductionLinkSha256)
 $sourceFiles.Add('supabase/.temp/project-ref',$ExpectedProductionLinkSha256)
 # Hold the reviewed package and source closure across compilation/materialization.
 $leaseCode=(New-Object Text.UTF8Encoding($false,$true)).GetString((Read-Bounded (Join-Path $packageRoot 'src/lib/release/protected-file-lease.cs') 1048576))
 Add-Type -TypeDefinition $leaseCode
 function Lease([string]$Root,$Map){
  $absolute=New-Object 'System.Collections.Generic.Dictionary[string,string]'
  foreach($name in $Map.Keys){$absolute.Add((Fixed-Child $Root $name),$Map[$name])}
  $lease=[HrMasterdata.Release.ProtectedFileLease]::Acquire($Root,$absolute);$leases.Add($lease)
 }
 $packageLeaseFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]' $packageFiles
 $packageLeaseFiles.Add('toolchain-package.json',$ExpectedPackageSha256)
 $packageLeaseFiles.Add('runtime-lease-inventory.json',$toolchain.runtimeLeaseSha256)
 Lease $packageRoot $packageLeaseFiles;Lease $sourceRoot $sourceFiles;Lease $sourceRoot $runtimeFiles;Lease $privateRoot $privateFiles
 $toolGroups=@()
 foreach($tool in @($toolchain.git,$toolchain.psql)){
  $full=[IO.Path]::GetFullPath($tool.executable);$toolRoot=[IO.Path]::GetDirectoryName($full)
  $map=New-Object 'System.Collections.Generic.Dictionary[string,string]';$map.Add([IO.Path]::GetFileName($full),$tool.sha256)
  Lease $toolRoot $map;$toolGroups+=,@{root=$toolRoot;files=$map}
 }
 $stage='materialize'
 $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl=New-Object Security.AccessControl.DirectorySecurity;$acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
 $root=Join-Path $profile ('.hr-masterdata-production-isolation-'+$ExpectedPackageSha256)
 Require (-not (Test-Path -LiteralPath $root));$null=[IO.Directory]::CreateDirectory($root,$acl)
 $installedFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]'
 foreach($name in $packageFiles.Keys){$destination=Fixed-Child $root $name;$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));$bytes=Read-Bounded (Fixed-Child $packageRoot $name) 200MB
  $stream=[IO.File]::Open($destination,'CreateNew','Write','None');try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()};$installedFiles.Add($name,$packageFiles[$name])
 }
 function Write-New([string]$Name,[byte[]]$Bytes){$file=Fixed-Child $root $Name;$stream=[IO.File]::Open($file,'CreateNew','Write','None');try{$stream.Write($Bytes,0,$Bytes.Length)}finally{$stream.Dispose()};$installedFiles.Add($Name,(Hash-Bytes $Bytes))}
 Write-New 'toolchain-package.json' $manifestBytes
 Write-New 'runtime-lease-inventory.json' (Read-Bounded (Join-Path $packageRoot 'runtime-lease-inventory.json') 65536)
 Write-New 'production-isolation-host.ps1' (Read-Bounded (Join-Path $packageRoot 'src/lib/release/production-isolation-host.ps1') 65536)
 $moduleRows=@()
 foreach($group in @(@{root=$root;files=$installedFiles},@{root=$sourceRoot;files=$sourceFiles},@{root=$sourceRoot;files=$runtimeFiles})){
  foreach($name in $group.files.Keys){$moduleRows+=@{path=(Fixed-Child $group.root $name);sha256=$group.files[$name]}}
 }
 $moduleBytes=[Text.Encoding]::UTF8.GetBytes(([ordered]@{schemaVersion=1;kind='protected-production-isolation-module-lease';files=$moduleRows}|ConvertTo-Json -Depth 5 -Compress))
 Require ($moduleBytes.Length -le 262144)
 Write-New 'module-lease.json' $moduleBytes
 $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider(2048);$rsa.PersistKeyInCsp=$false
 try{$privateKey=$rsa.ToXmlString($true);$public=$rsa.ExportParameters($false)}finally{$rsa.Dispose()}
 function Base64Url([byte[]]$Bytes){return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
 Write-New 'bootstrap-origin.json' ([Text.Encoding]::UTF8.GetBytes(([ordered]@{kty='RSA';n=(Base64Url $public.Modulus);e=(Base64Url $public.Exponent)}|ConvertTo-Json -Compress)))
 function Literal([string]$Value){return '@"'+$Value.Replace('"','""')+'"'}
 function Rows($Map){return (@($Map.Keys|Sort-Object|ForEach-Object {'{'+(Literal $_)+',"'+$Map[$_]+'"}'})-join ',')}
 function Constant([string]$Name,[string]$Value){return 'internal const string '+$Name+' = '+(Literal $Value)+';'}
 $plan='using System;using System.Collections.Generic;namespace HrMasterdata.Release { public static class Installation {'
 foreach($pair in @(
 @('Root',$root),@('CleanSourceRoot',$sourceRoot),@('RuntimeRoot',$sourceRoot),@('PrivilegedRoot',$privateRoot),@('InputRoot',$privateRoot),
 @('ProjectRef',$project),@('SourceCommit',$manifest.sourceCommit),@('TargetBindingSha256',$admission.targetBindingSha256),
 @('IsolationPlanSha256',$admission.isolationPlanSha256),@('WorkerSha256',$admission.rawModuleSha256),
 @('LiveAdapterSha256',$packageFiles['src/lib/release/production-isolation-live-adapter.mjs']),
 @('NodeExecutable',(Join-Path $root 'runtime/node.exe')),@('OriginPrivateKey',$privateKey)
 )){$plan+=Constant $pair[0] $pair[1]}
 $plan+='public static string PriorStateRoot {get{return '+(Literal (Join-Path $privateRoot 'production-isolation-prior-state'))+';}}'
 # Node is leased with the installed files, which are also a runtime lease group.
 $plan+='internal static readonly IDictionary<string,string> InstallationFiles=new Dictionary<string,string>{'+(Rows $installedFiles)+'};'
 $plan+='internal static readonly IDictionary<string,string> SourceFiles=new Dictionary<string,string>{'+(Rows $sourceFiles)+'};'
 $plan+='internal static readonly IDictionary<string,string> RuntimeFiles=new Dictionary<string,string>{'+(Rows $runtimeFiles)+'};'
 $plan+='internal static readonly IDictionary<string,string> PrivilegedFiles=new Dictionary<string,string>{'+(Rows $privateFiles)+'};'
 $plan+='internal sealed class LeaseGroup {internal string Root;internal IDictionary<string,string> Files;internal LeaseGroup(string root,IDictionary<string,string> files){Root=root;Files=files;}}'
 $groups=@($toolGroups|ForEach-Object {'new LeaseGroup('+(Literal $_.root)+',new Dictionary<string,string>{'+(Rows $_.files)+'})'})
 $plan+='internal static readonly LeaseGroup[] ToolGroups=new LeaseGroup[]{'+($groups -join ',')+'};'
 function Read-Code([string]$Path,[string]$Digest){return 'ProductionIsolationPrivateRuntime.ReadFixedRecord('+(Literal $Path)+',"'+$Digest+'")'}
 $plan+='internal static object ReadIsolationAdmission(){var value='+(Read-Code $ApprovedIsolationAdmissionPath $ExpectedIsolationAdmissionSha256)+';'
 foreach($pair in @(@($toolchain.tlsAdmissionPath,$admission.tlsAdmissionSha256),@($toolchain.egressAdmissionPath,$admission.egressAdmissionSha256),@($toolchain.managementApiCapabilityPath,$admission.managementApiCapabilitySha256))){$plan+=(Read-Code $pair[0] $pair[1])+';'}
 $plan+='value.Remove("schemaVersion");value.Remove("kind");return value;}'
 $plan+='internal static object ReadControlAdmission(){return '+(Read-Code $toolchain.runtimeRecordPath $toolchain.runtimeRecordSha256)+'["controlAdmission"];}'
 $plan+='internal static object ReadProbeContext(){return '+(Read-Code $toolchain.runtimeRecordPath $toolchain.runtimeRecordSha256)+'["probeContext"];}'
 $plan+='internal static object ReadSourceOptions(){return new {commit=SourceCommit,gitExecutable='+(Literal $toolchain.git.executable)+',expectedGitSha256="'+$toolchain.git.sha256+'"};}'
 $plan+='internal static object ReadPsqlTool(){return new {psqlExecutable='+(Literal $toolchain.psql.executable)+',expectedPsqlSha256="'+$toolchain.psql.sha256+'",expectedPsqlVersion='+(Literal $toolchain.psql.version)+'};}'
 $plan+='internal static string ReadManagementApiToken(){return ProductionIsolationPrivateRuntime.ReadManagementApiToken();}internal static string ReadAnonymousKey(string project){return ProductionIsolationPrivateRuntime.ReadAnonymousKey(project);}internal static string ReadServiceRoleKey(string project){return ProductionIsolationPrivateRuntime.ReadServiceRoleKey(project);}internal static object SealIsolationPriorState(string context,string prior){return ProductionIsolationPrivateRuntime.SealIsolationPriorState(context,prior);} }}'
 $stage='compile'
 $units=@($leaseCode)
 foreach($name in @('protected-production-inputs.cs','protected-production-isolation-host.cs','protected-production-isolation-core.cs','production-isolation-private-runtime.cs')){$units+=(New-Object Text.UTF8Encoding($false,$true)).GetString((Read-Bounded (Join-Path $root ('src/lib/release/'+$name)) 1048576))}
 $units+=$plan;$provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateExecutable=$true;$parameters.GenerateInMemory=$false;$parameters.OutputAssembly=Join-Path $root 'production-isolation.exe';$parameters.CompilerOptions='/optimize+ /platform:x64'
 foreach($assembly in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($assembly)}
 try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]$units);Require (-not $compiled.Errors.HasErrors)}finally{$provider.Dispose();$privateKey=$null;$plan=$null;$units=$null}
 $exeSha=Hash-Bytes (Read-Bounded $parameters.OutputAssembly 200MB)
 $installedFiles.Add('production-isolation.exe',$exeSha);Lease $root $installedFiles
 [ordered]@{installed=$true;packageSha256=$ExpectedPackageSha256;launcherSha256=$exeSha;sourceCommit=$manifest.sourceCommit;hostedAccess=$false;privateInputsLoaded=$false;operation='temporary-production-isolation'}|ConvertTo-Json -Compress
} catch {
 [ordered]@{installed=$false;stage=$stage;detailsSuppressed=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
 exit 1
} finally {
 for($index=$leases.Count-1;$index -ge 0;$index--){$leases[$index].Dispose()}
}