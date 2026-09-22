param(
  [Parameter(Mandatory=$true)][string]$Workspace,
  [Parameter(Mandatory=$true)][string]$NodeExecutable
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'Windows PowerShell 5.1 required'}
Add-Type -AssemblyName System.Security

$ps=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$results=New-Object 'System.Collections.Generic.List[object]'
function Check([string]$Name,[scriptblock]$Body){try{& $Body;$results.Add(@{name=$Name;passed=$true})}catch{$results.Add(@{name=$Name;passed=$false})}}
function Rejected([scriptblock]$Body){$failed=$false;try{& $Body}catch{$failed=$true};if(-not $failed){throw 'expected refusal'}}
function Sha([byte[]]$Bytes){$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Git-BlobSha([byte[]]$Bytes){$sha=[Security.Cryptography.SHA1]::Create();try{$prefix=[Text.Encoding]::ASCII.GetBytes(('blob '+$Bytes.Length+[char]0));return ([BitConverter]::ToString($sha.ComputeHash([byte[]]($prefix+$Bytes)))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Private-Directory([string]$Path){
  $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl=New-Object Security.AccessControl.DirectorySecurity
  $acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
  $null=[IO.Directory]::CreateDirectory($Path,$acl)
}
function Private-File([string]$Path,[byte[]]$Bytes){
  [IO.File]::WriteAllBytes($Path,$Bytes)
  $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl=New-Object Security.AccessControl.FileSecurity
  $acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','Allow')))}
  [IO.File]::SetAccessControl($Path,$acl)
}
function Run-Process([string]$File,[string]$Arguments,[hashtable]$Environment=@{},[int]$Timeout=120000){
  $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=$File;$info.Arguments=$Arguments;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  foreach($entry in $Environment.GetEnumerator()){$info.EnvironmentVariables[$entry.Key]=[string]$entry.Value}
  $process=[Diagnostics.Process]::Start($info)
  try{if(-not $process.WaitForExit($Timeout)){throw 'process timeout'};return @{status=$process.ExitCode;output=$process.StandardOutput.ReadToEnd();error=$process.StandardError.ReadToEnd()}}finally{if(-not $process.HasExited){$process.Kill();$process.WaitForExit(5000)|Out-Null};$process.Dispose()}
}

$outer=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-dryrun-fixture-'+[Guid]::NewGuid().ToString('N'))
$root=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-toolchain-fixture-'+[Guid]::NewGuid().ToString('N'))
$inputs=$outer+'-inputs';$link=$outer+'-link';$marker=$outer+'-calls';$cliModePath=$outer+'-mode'
Private-Directory $outer;Private-Directory $root;Private-Directory $inputs;Private-Directory (Join-Path $inputs 'inputs');Private-Directory (Join-Path $inputs 'certificates')
$ref='abcdefghijklmno12345';$pooler='aws-eu-west-1.pooler.supabase.com';$certPath=Join-Path $inputs 'certificates\production-root-ca.crt'
$cert=[Text.Encoding]::ASCII.GetBytes("-----BEGIN CERTIFICATE-----`nsynthetic fixture only`n-----END CERTIFICATE-----`n")
Private-File $certPath $cert
$certRecord=[ordered]@{schemaVersion=1;purpose='Production TLS root certificate';environment='production';provenance='Owner-confirmed fresh production project dashboard download; identity is retained only inside the encrypted input';operatorConfirmedSource=$true;certificatePath=$certPath;certificateSHA256=(Sha $cert);certificateAuthority=$true;containsPrivateKey=$false;notBeforeUtc='2026-01-01T00:00:00.0000000Z';notAfterUtc='2036-01-01T00:00:00.0000000Z';recordedAtUtc=[DateTime]::UtcNow.ToString('o');aclRestricted=$true;liveProductionTlsVerified=$false;releaseVerificationRequired=$true}
$payload=[ordered]@{schemaVersion=1;environment='production';EXPECTED_SUPABASE_ENVIRONMENT='production';SUPABASE_DB_CONNECTION_MODE='session-pooler';projectRef=$ref;databasePassword='synthetic-password';EXPECTED_SUPABASE_POOLER_HOST=$pooler;sslMode='verify-full';source='Owner-entered production dashboard project ID and Session pooler template';ownerConfirmedProduction=$true;certificateSource='Owner-confirmed fresh download from the same production project Database Settings SSL Configuration';recordedAtUtc=[DateTime]::UtcNow.ToString('o');SUPABASE_SSL_ROOT_CERT=$certPath;EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256=(Sha $cert)}
$entropy=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/private-inputs/v1');$plain=[Text.Encoding]::UTF8.GetBytes(($payload|ConvertTo-Json -Compress));$blob=[Security.Cryptography.ProtectedData]::Protect($plain,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Array]::Clear($plain,0,$plain.Length);[Array]::Clear($entropy,0,$entropy.Length)
$blobPath=Join-Path $inputs 'inputs\production-inputs.v1.dpapi';Private-File $blobPath $blob
$record=[ordered]@{schemaVersion=1;purpose='Production inputs captured locally for reviewed release tooling';environment='production';protectionScope='DPAPI CurrentUser';entropyLabel='hr-masterdata/production/private-inputs/v1';fieldsPresent=@($payload.Keys);encryptedBlobPath=$blobPath;encryptedBlobSHA256=(Sha $blob);selfTestPassed=$true;aclRestricted=$true;recordedAtUtc=[DateTime]::UtcNow.ToString('o');ownerConfirmedProduction=$true;targetBindingVerified=$false;liveProductionTlsVerified=$false;passwordAuthenticationTested=$false;hostedConnectionAttempted=$false;releaseVerificationRequired=$true}
Private-File (Join-Path $inputs 'inputs\production-inputs.v1.record.json') ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))
Private-File (Join-Path $inputs 'certificates\production-root-ca-record.json') ([Text.Encoding]::UTF8.GetBytes(($certRecord|ConvertTo-Json -Compress)))
Private-File $link ([Text.Encoding]::UTF8.GetBytes($ref))
[IO.File]::WriteAllText($cliModePath,'ok')

$files=@(
 'runtime/node.exe','runtime/supabase.exe',
 'src/lib/release/protected-file-lease.cs',
 'src/lib/release/protected-dry-run-host.cs','src/lib/release/protected-dry-run-worker.mjs','src/lib/release/protected-production-inputs.cs','src/lib/release/production-bootstrap-admission.mjs',
 'supabase/verify/run-reviewed-supabase-cli.mjs','supabase/verify/verify-production-baseline-catalog.mjs','supabase/verify/verify-target-binding.mjs',
 'node_modules/papaparse/package.json','node_modules/papaparse/papaparse.js','supabase/migration-baseline-manifest.json'
)
$migrations=Get-ChildItem (Join-Path $Workspace 'supabase\migrations') -File | Sort-Object Name | Where-Object {$_.BaseName -in @('20260314000001_add_update_staffing_need_rpc','20260314000002_add_headcount_upper_bound','20260614000000_reconcile_environments_security_and_policies','20260615000000_add_is_checklist_item_to_column_config','20260709194903_remediate_pr_91_security_findings','20260710144000_atomic_external_column_presentation','20260710150000_atomic_user_status_transition','20260831200026_enforce_active_authorization_and_atomic_user_deletion','20260909115242_reconcile_saved_filters_and_room_acl','20260910094517_reconcile_repayment_defaults','20260910115024_reconcile_post_apply_acl_and_policy_initplans','20260910184840_reconcile_canonical_trigger_acl_prerequisite','20260910184841_reconcile_column_config_timestamp_and_audit_trigger')} | ForEach-Object {'supabase/migrations/'+$_.Name}
if(@($migrations).Count -ne 13){throw 'fixture plan unavailable'}
$files+=@($migrations)
foreach($relative in $files){$dest=Join-Path $root $relative;$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dest));if($relative -eq 'runtime/node.exe'){[IO.File]::Copy($NodeExecutable,$dest,$false)}elseif($relative -eq 'runtime/supabase.exe'){}else{[IO.File]::Copy((Join-Path $Workspace $relative),$dest,$false)}}
$fake=@"
using System; using System.IO; using System.Linq; using System.Threading;
class FixtureCli { static int Main(string[] args) {
 string marker=@"$($marker.Replace('"','""'))"; string mode=File.ReadAllText(@"$($cliModePath.Replace('"','""'))").Trim();
 if(args.Length==1 && args[0]=="--version") { File.AppendAllText(marker,"version\n"); Console.WriteLine("2.115.0"); return 0; }
 string expected="db|push|--dry-run|--include-all|--skip-vault|--db-url|postgresql:///postgres?sslmode=verify-full";
 File.AppendAllText(marker,"mode:"+mode+"\nargs:"+String.Join("|",args)+"\n");
 if(String.Join("|",args)!=expected || Environment.GetEnvironmentVariable("NODE_OPTIONS")!=null || Environment.GetEnvironmentVariable("NODE_PATH")!=null || Environment.GetEnvironmentVariable("FIXTURE_AMBIENT")!=null) return 73;
 if(mode=="nonzero") return 42; if(mode=="hang") { Thread.Sleep(120000); return 0; }
 string[] files=new string[]{ $((@($migrations)|ForEach-Object {'"'+($_.Split('/')[-1])+'"'}) -join ',') };
 if(mode=="wrong-order") Array.Reverse(files); if(mode=="extra") files=files.Concat(new[]{"20270101000000_extra.sql"}).ToArray(); if(mode=="missing") files=files.Take(files.Length-1).ToArray();
 foreach(string file in files) Console.WriteLine(file); return 0; } }
"@
Add-Type -TypeDefinition $fake -OutputAssembly (Join-Path $root 'runtime\supabase.exe') -OutputType ConsoleApplication
$plan=@();foreach($relative in $migrations){$name=Split-Path $relative -Leaf;$version=$name.Substring(0,14);$migrationBytes=[IO.File]::ReadAllBytes((Join-Path $root $relative));$plan+=([ordered]@{version=$version;file=$name;gitBlob=(Git-BlobSha $migrationBytes);sha256=(Sha $migrationBytes)})}
$entries=@($files|ForEach-Object {[ordered]@{path=$_;sha256=(Sha ([IO.File]::ReadAllBytes((Join-Path $root $_))) )}})
$manifest=[ordered]@{schemaVersion=1;kind='offline-protected-dry-run-package';executable=$false;privateMaterialAllowed=$false;approvalAttested=$false;sourceCommit=('b'*40);sourceTree=('c'*40);sourceManifestSha256=(Sha ([IO.File]::ReadAllBytes((Join-Path $root 'supabase\migration-baseline-manifest.json'))));plan=$plan;files=$entries}
$manifestBytes=[Text.Encoding]::UTF8.GetBytes(($manifest|ConvertTo-Json -Depth 8 -Compress));[IO.File]::WriteAllBytes((Join-Path $root 'toolchain-package.json'),$manifestBytes);$packageSha=Sha $manifestBytes
$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider(2048);$rsa.PersistKeyInCsp=$false
try{$private=$rsa.ToXmlString($true);$pub=$rsa.ExportParameters($false)}finally{$rsa.Dispose()}
function Base64Url([byte[]]$Bytes){return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
$origin=[Text.Encoding]::UTF8.GetBytes(([ordered]@{kty='RSA';n=(Base64Url $pub.Modulus);e=(Base64Url $pub.Exponent)}|ConvertTo-Json -Compress));[IO.File]::WriteAllBytes((Join-Path $root 'bootstrap-origin.json'),$origin)
$allEntries=@($entries)+@([ordered]@{path='toolchain-package.json';sha256=$packageSha},[ordered]@{path='bootstrap-origin.json';sha256=(Sha $origin)})
$rows=@($allEntries|ForEach-Object {'{ @"'+$_.path.Replace('/','\')+'", "'+$_.sha256+'" }'}) -join ','
$installation='namespace HrMasterdata.Release { internal static class Installation { internal const string Root=@"'+$root.Replace('"','""')+'"; internal const string InputRoot=@"'+$inputs.Replace('"','""')+'"; internal const string LinkPath=@"'+$link.Replace('"','""')+'"; internal const string LinkSha256="'+(Sha ([IO.File]::ReadAllBytes($link)))+'"; internal const string OriginPrivateKey=@"'+$private.Replace('"','""')+'"; internal static readonly System.Collections.Generic.Dictionary<string,string> Files=new System.Collections.Generic.Dictionary<string,string> { '+$rows+' }; } }'
$leaseCode=[Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $root 'src\lib\release\protected-file-lease.cs')))
$hostCode=[Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $root 'src\lib\release\protected-dry-run-host.cs')))
$inputCode=[Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $root 'src\lib\release\protected-production-inputs.cs')))
$provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$cp=New-Object CodeDom.Compiler.CompilerParameters;$cp.GenerateExecutable=$true;$cp.OutputAssembly=Join-Path $root 'dry-run.exe';$cp.CompilerOptions='/optimize+ /platform:x64';$null=$cp.ReferencedAssemblies.Add('System.dll');$null=$cp.ReferencedAssemblies.Add('System.Core.dll');$null=$cp.ReferencedAssemblies.Add('System.Security.dll');$null=$cp.ReferencedAssemblies.Add('System.Web.Extensions.dll')
try{$compiled=$provider.CompileAssemblyFromSource($cp,[string[]]@($leaseCode,$hostCode,$inputCode,$installation))}finally{$provider.Dispose();$private=$null}
if($compiled.Errors.HasErrors){throw 'fixture host compilation failed'}
$exe=Join-Path $root 'dry-run.exe'
function Run-Host([int]$Timeout=120000){return Run-Process $exe '' @{NODE_OPTIONS='--require=untrusted';NODE_PATH='untrusted';FIXTURE_AMBIENT='untrusted'} $Timeout}
function Count-Calls {if(Test-Path $marker){return @([IO.File]::ReadAllLines($marker)).Count};return 0}
function Assert-Refused([string]$FixtureMode,[int]$Timeout=120000){[IO.File]::WriteAllText($cliModePath,$FixtureMode);$before=Count-Calls;try{$r=Run-Host $Timeout;$calls=@([IO.File]::ReadAllLines($marker));if($r.status -eq 0 -or $calls.Count -ne ($before+3) -or $calls[-3] -ne 'version' -or $calls[-2] -ne ('mode:'+$FixtureMode) -or $calls[-1] -notmatch '^args:db\|push\|--dry-run\|--include-all\|--skip-vault\|--db-url\|postgresql:///postgres\?sslmode=verify-full$'){throw 'not exercised'};if($r.output -match 'synthetic|password|pooler'){throw 'output leaked'}}finally{[IO.File]::WriteAllText($cliModePath,'ok')}}
function Write-MismatchedSyntheticInput {
  $changed=[ordered]@{schemaVersion=1;environment='production';EXPECTED_SUPABASE_ENVIRONMENT='production';SUPABASE_DB_CONNECTION_MODE='session-pooler';projectRef='zzzzzzzzzzzzzzz99999';databasePassword='synthetic-password';EXPECTED_SUPABASE_POOLER_HOST=$pooler;sslMode='verify-full';source='Owner-entered production dashboard project ID and Session pooler template';ownerConfirmedProduction=$true;certificateSource='Owner-confirmed fresh download from the same production project Database Settings SSL Configuration';recordedAtUtc=[DateTime]::UtcNow.ToString('o');SUPABASE_SSL_ROOT_CERT=$certPath;EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256=(Sha $cert)}
  $localEntropy=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/private-inputs/v1');$localPlain=[Text.Encoding]::UTF8.GetBytes(($changed|ConvertTo-Json -Compress));$localBlob=[Security.Cryptography.ProtectedData]::Protect($localPlain,$localEntropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Array]::Clear($localPlain,0,$localPlain.Length);[Array]::Clear($localEntropy,0,$localEntropy.Length)
  $changedRecord=([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $inputs 'inputs\production-inputs.v1.record.json')))|ConvertFrom-Json);$changedRecord.encryptedBlobSHA256=Sha $localBlob
  Private-File $blobPath $localBlob;Private-File (Join-Path $inputs 'inputs\production-inputs.v1.record.json') ([Text.Encoding]::UTF8.GetBytes(($changedRecord|ConvertTo-Json -Compress)))
}
function New-CleanPackageCopy([string]$Name){$copy=Join-Path $outer $Name;Private-Directory $copy;foreach($relative in $files){$destination=Join-Path $copy $relative;$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));[IO.File]::Copy((Join-Path $root $relative),$destination,$false)};[IO.File]::Copy((Join-Path $root 'toolchain-package.json'),(Join-Path $copy 'toolchain-package.json'),$false);return $copy}

Check 'valid-exact-production-dry-run-only' {$r=Run-Host;if($r.status -ne 0){throw 'dry run failed'};$receipt=$r.output.Trim()|ConvertFrom-Json;if($receipt.kind -ne 'protected-production-dry-run' -or -not $receipt.planningOnly -or $receipt.authorizesApply -or $receipt.authorizesRepair -or $receipt.authorizesCleanup -or @($receipt.versions).Count -ne 13){throw 'bad receipt'};if($r.output -match 'synthetic-password|'+$pooler){throw 'output leaked'}}
Check 'version-and-exact-dry-run-arguments-only' {$calls=@([IO.File]::ReadAllLines($marker));if($calls[-3] -ne 'version' -or $calls[-2] -ne 'mode:ok' -or $calls[-1] -notmatch '^args:db\|push\|--dry-run\|--include-all\|--skip-vault\|--db-url\|postgresql:///postgres\?sslmode=verify-full$' -or ($calls -match 'apply|repair').Count -ne 0){throw 'command shape'}}
Check 'ambient-environment-stripped' {$r=Run-Host;if($r.status -ne 0){throw 'ambient reached cli'}}
Check 'wrong-order-cli-output-refused' {Assert-Refused 'wrong-order'}
Check 'extra-cli-output-refused' {Assert-Refused 'extra'}
Check 'missing-cli-output-refused' {Assert-Refused 'missing'}
Check 'nonzero-cli-refused' {Assert-Refused 'nonzero'}
Check 'timed-out-cli-refused' {Assert-Refused 'hang' 100000}
Check 'tampered-immutable-worker-refused-before-cli' {$worker=Join-Path $root 'src\lib\release\protected-dry-run-worker.mjs';$bytes=[IO.File]::ReadAllBytes($worker);$before=Count-Calls;try{[IO.File]::AppendAllText($worker,'tamper');$r=Run-Host;if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{[IO.File]::WriteAllBytes($worker,$bytes)}}
Check 'preexisting-writer-refused-before-cli' {$worker=Join-Path $root 'src\lib\release\protected-dry-run-worker.mjs';$before=Count-Calls;$writer=[IO.File]::Open($worker,'Open','Write','ReadWrite,Delete');try{$r=Run-Host;if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{$writer.Dispose()}}
Check 'independent-link-hash-refused-before-cli' {$bytes=[IO.File]::ReadAllBytes($link);$before=Count-Calls;try{[IO.File]::WriteAllText($link,'zzzzzzzzzzzzzzz99999');$r=Run-Host;if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{[IO.File]::WriteAllBytes($link,$bytes)}}
Check 'independent-link-value-mismatch-refused-before-cli' {$originalBlob=[IO.File]::ReadAllBytes($blobPath);$originalRecord=[IO.File]::ReadAllBytes((Join-Path $inputs 'inputs\production-inputs.v1.record.json'));$before=Count-Calls;try{Write-MismatchedSyntheticInput;$r=Run-Host;if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{Private-File $blobPath $originalBlob;Private-File (Join-Path $inputs 'inputs\production-inputs.v1.record.json') $originalRecord}}
Check 'direct-worker-and-unsigned-packet-refused-before-cli' {$worker=Join-Path $root 'src\lib\release\protected-dry-run-worker.mjs';$before=Count-Calls;$r=Run-Process (Join-Path $root 'runtime\node.exe') ('--no-addons --no-global-search-paths "'+$worker+'"') @{} 15000;if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}
# The fixture supplies a matching synthetic digest only to test installer
# mechanics. It is not an operator approval record and the generated launcher
# is deliberately never started because its input root is the real fixed path.
Check 'actual-installer-materializes-synthetic-package-without-launch' {$copy=New-CleanPackageCopy 'positive-installer';$bytes=[IO.File]::ReadAllBytes((Join-Path $copy 'toolchain-package.json'));$before=Count-Calls;$r=Run-Process $ps ('-NoProfile -NonInteractive -File "'+(Join-Path $Workspace 'src\lib\release\install-protected-dry-run.ps1')+'" -PackageDirectory "'+$copy+'" -ExpectedPackageSha256 '+(Sha $bytes)+' -ApprovedProductionLinkPath "'+$link+'" -ExpectedProductionLinkSha256 '+(Sha ([IO.File]::ReadAllBytes($link)))) @{} 60000;if($r.status -ne 0){throw 'install failed'};$receipt=$r.output.Trim()|ConvertFrom-Json;$installedRoot=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-toolchain-dryrun-'+(Sha $bytes));if(-not $receipt.installed -or -not(Test-Path -LiteralPath (Join-Path $installedRoot 'dry-run.exe')) -or (Count-Calls) -ne $before){throw 'unexpected launch or missing launcher'}}
Check 'package-plan-mismatch-refused-with-matching-external-digest' {$copy=New-CleanPackageCopy 'bad-plan';$manifestPath=Join-Path $copy 'toolchain-package.json';$bad=([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($manifestPath))|ConvertFrom-Json);$bad.plan[0].version='20270101000000';$bytes=[Text.Encoding]::UTF8.GetBytes(($bad|ConvertTo-Json -Depth 8 -Compress));[IO.File]::WriteAllBytes($manifestPath,$bytes);$r=Run-Process $ps ('-NoProfile -NonInteractive -File "'+(Join-Path $Workspace 'src\lib\release\install-protected-dry-run.ps1')+'" -PackageDirectory "'+$copy+'" -ExpectedPackageSha256 '+(Sha $bytes)+' -ApprovedProductionLinkPath "'+$link+'" -ExpectedProductionLinkSha256 '+(Sha ([IO.File]::ReadAllBytes($link)))) @{} 30000;if($r.status -eq 0){throw 'accepted'}}
Check 'package-extra-file-refused-with-matching-external-digest' {$copy=New-CleanPackageCopy 'extra-file';$manifestPath=Join-Path $copy 'toolchain-package.json';$bytes=[IO.File]::ReadAllBytes($manifestPath);[IO.File]::WriteAllText((Join-Path $copy 'extra.txt'),'synthetic extra');$r=Run-Process $ps ('-NoProfile -NonInteractive -File "'+(Join-Path $Workspace 'src\lib\release\install-protected-dry-run.ps1')+'" -PackageDirectory "'+$copy+'" -ExpectedPackageSha256 '+(Sha $bytes)+' -ApprovedProductionLinkPath "'+$link+'" -ExpectedProductionLinkSha256 '+(Sha ([IO.File]::ReadAllBytes($link)))) @{} 30000;if($r.status -eq 0){throw 'accepted'}}
[ordered]@{cases=@($results.ToArray());syntheticOnly=$true;hostedAccess=$false;privateInputsLoaded=$false;fixtureRetained=$true}|ConvertTo-Json -Depth 5 -Compress
if(@($results|Where-Object {-not $_.passed}).Count){exit 1}
