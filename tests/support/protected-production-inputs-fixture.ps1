param([Parameter(Mandatory=$true)][string]$Workspace)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'Windows PowerShell 5.1 required'}
# Compile separate source units into one assembly: the internal loader deliberately
# has no PowerShell-facing API. This fixture invokes it by reflection only.
$leaseCode=Get-Content -Raw (Join-Path $Workspace 'src\lib\release\protected-file-lease.cs')
$inputsCode=Get-Content -Raw (Join-Path $Workspace 'src\lib\release\protected-production-inputs.cs')
$provider=New-Object Microsoft.CSharp.CSharpCodeProvider
$parameters=New-Object CodeDom.Compiler.CompilerParameters
$parameters.GenerateExecutable=$false;$parameters.GenerateInMemory=$true
$null=$parameters.ReferencedAssemblies.Add('System.dll');$null=$parameters.ReferencedAssemblies.Add('System.Core.dll')
$null=$parameters.ReferencedAssemblies.Add('System.Security.dll');$null=$parameters.ReferencedAssemblies.Add('System.Web.Extensions.dll')
try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]@($leaseCode,$inputsCode))}finally{$provider.Dispose()}
if($compiled.Errors.HasErrors){throw 'fixture compilation failed'}
$loaderType=$compiled.CompiledAssembly.GetType('HrMasterdata.Release.ProductionInputs',$false)
if($null -eq $loaderType){throw 'loader type unavailable'}
function Load-Synthetic([string]$Root){return $loaderType.GetMethod('Load',[Reflection.BindingFlags]'Public,Static').Invoke($null,@($Root))}
function Get-Environment([object]$Loaded){return $loaderType.GetProperty('EnvironmentValues',[Reflection.BindingFlags]'Public,Instance').GetValue($Loaded,$null)}
function Dispose-Inputs([object]$Loaded){$loaderType.GetMethod('Dispose',[Reflection.BindingFlags]'Public,Instance').Invoke($Loaded,@())}
$results=New-Object 'System.Collections.Generic.List[object]'
function Check([string]$Name,[scriptblock]$Body){try{& $Body;$results.Add(@{name=$Name;passed=$true})}catch{$results.Add(@{name=$Name;passed=$false;errorType=$_.Exception.GetType().Name;line=$_.InvocationInfo.ScriptLineNumber})}}
function Expect-Rejected([scriptblock]$Body){$rejected=$false;try{& $Body}catch{$rejected=$true};if(-not $rejected){throw 'expected refusal'}}
function Sha([byte[]]$Bytes){$sha=[Security.Cryptography.SHA256]::Create();try{[BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Write-Private([string]$Path,[byte[]]$Bytes){[IO.File]::WriteAllBytes($Path,$Bytes);$acl=New-Object Security.AccessControl.FileSecurity;$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acl.SetAccessRuleProtection($true,$false);$acl.SetOwner($sid);foreach($id in @($sid.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($id)),'FullControl','Allow')))};[IO.File]::SetAccessControl($Path,$acl)}
function Protect-Directory([string]$Path){$null=[IO.Directory]::CreateDirectory($Path);$acl=New-Object Security.AccessControl.DirectorySecurity;$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acl.SetAccessRuleProtection($true,$false);$acl.SetOwner($sid);foreach($id in @($sid.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($id)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))};[IO.Directory]::SetAccessControl($Path,$acl)}
$root=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-production-inputs-fixture-'+[Guid]::NewGuid().ToString('N'))
$inputs=Join-Path $root 'inputs';$certs=Join-Path $root 'certificates';Protect-Directory $root;Protect-Directory $inputs;Protect-Directory $certs
$ref='abcdefghijklmno12345';$fixturePoolerHost='aws-eu-west-1.pooler.supabase.com';$password='synthetic-password';$cert=[Text.Encoding]::ASCII.GetBytes('synthetic-public-certificate')
$certPath=Join-Path $certs 'production-root-ca.crt';$certRecordPath=Join-Path $certs 'production-root-ca-record.json';$blobPath=Join-Path $inputs 'production-inputs.v1.dpapi';$recordPath=Join-Path $inputs 'production-inputs.v1.record.json'
function Save-Fixture([string]$Mode='valid'){
 $payload=[ordered]@{schemaVersion=1;environment='production';EXPECTED_SUPABASE_ENVIRONMENT='production';SUPABASE_DB_CONNECTION_MODE='session-pooler';projectRef=$ref;databasePassword=$password;EXPECTED_SUPABASE_POOLER_HOST=$fixturePoolerHost;sslMode='verify-full';source='Owner-entered production dashboard project ID and Session pooler template';ownerConfirmedProduction=$true;certificateSource='Owner-confirmed fresh download from the same production project Database Settings SSL Configuration';recordedAtUtc=[DateTime]::UtcNow.ToString('o');SUPABASE_SSL_ROOT_CERT=$certPath;EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256=(Sha $cert)}
 if($Mode -eq 'wrong-environment'){$payload.environment='staging'};if($Mode -eq 'wrong-mode'){$payload.SUPABASE_DB_CONNECTION_MODE='direct'};if($Mode -eq 'extra-payload'){$payload.extra='forbidden'};if($Mode -eq 'wrong-certificate-path'){$payload.SUPABASE_SSL_ROOT_CERT=(Join-Path $inputs 'wrong.crt')};if($Mode -eq 'wrong-certificate-hash'){$payload.EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256=('0'*64)}
 $entropy=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/private-inputs/v1');$plain=[Text.Encoding]::UTF8.GetBytes(($payload|ConvertTo-Json -Compress));$blob=[Security.Cryptography.ProtectedData]::Protect($plain,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Array]::Clear($plain,0,$plain.Length);[Array]::Clear($entropy,0,$entropy.Length)
 Write-Private $certPath $cert;Write-Private $blobPath $blob
 $certRecord=[ordered]@{schemaVersion=1;purpose='Production TLS root certificate';environment='production';provenance='Owner-confirmed fresh production project dashboard download; identity is retained only inside the encrypted input';operatorConfirmedSource=$true;certificatePath=$certPath;certificateSHA256=(Sha $cert);certificateAuthority=$true;containsPrivateKey=$false;notBeforeUtc='2026-01-01T00:00:00.0000000Z';notAfterUtc='2036-01-01T00:00:00.0000000Z';recordedAtUtc=[DateTime]::UtcNow.ToString('o');aclRestricted=$true;liveProductionTlsVerified=$false;releaseVerificationRequired=$true}
 $record=[ordered]@{schemaVersion=1;purpose='Production inputs captured locally for reviewed release tooling';environment='production';protectionScope='DPAPI CurrentUser';entropyLabel='hr-masterdata/production/private-inputs/v1';fieldsPresent=@($payload.Keys);encryptedBlobPath=$blobPath;encryptedBlobSHA256=(Sha $blob);selfTestPassed=$true;aclRestricted=$true;recordedAtUtc=[DateTime]::UtcNow.ToString('o');ownerConfirmedProduction=$true;targetBindingVerified=$false;liveProductionTlsVerified=$false;passwordAuthenticationTested=$false;hostedConnectionAttempted=$false;releaseVerificationRequired=$true}
 Write-Private $certRecordPath ([Text.Encoding]::UTF8.GetBytes(($certRecord|ConvertTo-Json -Compress)));Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))
 if($Mode -eq 'tampered-blob'){[IO.File]::WriteAllBytes($blobPath,[byte[]](1,2,3,4));$acl=[IO.File]::GetAccessControl($blobPath);[IO.File]::SetAccessControl($blobPath,$acl)}
 if($Mode -eq 'wrong-record-hash'){$record=(Get-Content -Raw $recordPath|ConvertFrom-Json);$record.encryptedBlobSHA256=('0'*64);Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))}
 if($Mode -eq 'wrong-record-schema'){$record=(Get-Content -Raw $recordPath|ConvertFrom-Json);$record.schemaVersion=2;Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))}
 if($Mode -eq 'extra-record-field'){$record=(Get-Content -Raw $recordPath|ConvertFrom-Json);$record|Add-Member -NotePropertyName unexpected -NotePropertyValue $true;Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))}
 if($Mode -eq 'duplicate-record-key'){$json=Get-Content -Raw $recordPath;$json=$json -replace '"schemaVersion":1','"schemaVersion":1,"schemaVersion":1';Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes($json))}
 if($Mode -eq 'duplicate-payload'){$json='{'+('"schemaVersion":1,"schemaVersion":1,"environment":"production","EXPECTED_SUPABASE_ENVIRONMENT":"production","SUPABASE_DB_CONNECTION_MODE":"session-pooler","projectRef":"'+$ref+'","databasePassword":"'+$password+'","EXPECTED_SUPABASE_POOLER_HOST":"'+$fixturePoolerHost+'","sslMode":"verify-full","source":"Owner-entered production dashboard project ID and Session pooler template","ownerConfirmedProduction":true,"certificateSource":"Owner-confirmed fresh download from the same production project Database Settings SSL Configuration","recordedAtUtc":"2026-01-01T00:00:00Z","SUPABASE_SSL_ROOT_CERT":"'+$certPath.Replace('\','\\')+'","EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256":"'+(Sha $cert)+'"}') ;$entropy=[Text.Encoding]::UTF8.GetBytes('hr-masterdata/production/private-inputs/v1');$replacement=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($json),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Array]::Clear($entropy,0,$entropy.Length);Write-Private $blobPath $replacement;$record=(Get-Content -Raw $recordPath|ConvertFrom-Json);$record.encryptedBlobSHA256=(Sha $replacement);Write-Private $recordPath ([Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress)))}
}
function Recreate([string]$Mode='valid'){Save-Fixture $Mode}
Save-Fixture
Check 'untrusted-owner-descriptor-rejected' {$descriptor=New-Object Security.AccessControl.RawSecurityDescriptor('O:S-1-1-0G:SYD:(A;;FA;;;SY)');Expect-Rejected {[HrMasterdata.Release.ProtectedFileLease]::ValidateDescriptor($descriptor,$false,$false)}}
Check 'valid-synthetic-current-user-dpapi-and-acl-load' {$loaded=Load-Synthetic $root;try{$e=Get-Environment $loaded;if($e['EXPECTED_SUPABASE_ENVIRONMENT'] -ne 'production' -or $e['EXPECTED_SUPABASE_PROJECT_REF'] -ne $ref -or $e['SUPABASE_DB_CONNECTION_MODE'] -ne 'session-pooler' -or -not $e['SUPABASE_DB_URL'].Contains($fixturePoolerHost) -or $e.Keys.Count -ne 7){throw 'bad environment'}}finally{Dispose-Inputs $loaded};if((Get-Environment $loaded).Keys.Count -ne 0){throw 'environment survives dispose'}}
Check 'tampered-blob-rejected' {Recreate 'tampered-blob';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-record-hash-rejected' {Recreate 'wrong-record-hash';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-record-schema-rejected' {Recreate 'wrong-record-schema';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'extra-record-field-rejected' {Recreate 'extra-record-field';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'duplicate-record-key-rejected' {Recreate 'duplicate-record-key';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'extra-payload-field-rejected' {Recreate 'extra-payload';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'duplicate-payload-key-rejected' {Recreate 'duplicate-payload';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-environment-rejected' {Recreate 'wrong-environment';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-mode-rejected' {Recreate 'wrong-mode';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-certificate-path-rejected' {Recreate 'wrong-certificate-path';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'wrong-certificate-hash-rejected' {Recreate 'wrong-certificate-hash';Expect-Rejected {Load-Synthetic $root};Recreate}
Check 'untrusted-ancestor-writable-rejected' {$acl=[IO.Directory]::GetAccessControl($root);$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier('S-1-1-0')),'Write','Allow')));[IO.Directory]::SetAccessControl($root,$acl);try{Expect-Rejected {Load-Synthetic $root}}finally{Protect-Directory $root}}
Check 'reparse-input-directory-rejected' {
 $real=Join-Path $root 'real-inputs'
 $boundary=[IO.Path]::GetFullPath($root).TrimEnd('\')+'\'
 foreach($target in @($inputs,$real)){if(-not [IO.Path]::GetFullPath($target).StartsWith($boundary,[StringComparison]::OrdinalIgnoreCase)){throw 'fixture boundary'}}
 Move-Item -LiteralPath $inputs -Destination $real
 try{$null=New-Item -ItemType Junction -Path $inputs -Target $real;Expect-Rejected {Load-Synthetic $root}}
 finally{
  if(Test-Path -LiteralPath $inputs){if(([IO.File]::GetAttributes($inputs) -band [IO.FileAttributes]::ReparsePoint) -eq 0){throw 'expected fixture junction'};[IO.Directory]::Delete($inputs,$false)}
  Move-Item -LiteralPath $real -Destination $inputs
 }
}
Check 'writer-held-before-lease-rejected' {$writer=[IO.File]::Open($blobPath,'Open','Write','ReadWrite,Delete');try{Expect-Rejected {Load-Synthetic $root}}finally{$writer.Dispose()}}
Check 'lease-blocks-writer-until-dispose' {$loaded=Load-Synthetic $root;try{Expect-Rejected {$writer=[IO.File]::Open($blobPath,'Open','Write','ReadWrite');$writer.Dispose()}}finally{Dispose-Inputs $loaded};$writer=[IO.File]::Open($blobPath,'Open','Write','Read');$writer.Dispose()}
[ordered]@{cases=@($results.ToArray());syntheticOnly=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Depth 4 -Compress
if(@($results|Where-Object {-not $_.passed}).Count -ne 0){exit 1}
