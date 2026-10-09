param([string]$ReleaseRoot,[string]$FixtureRoot)
$ErrorActionPreference='Stop'
$stage='source'
try {
 $private=[IO.File]::ReadAllText((Join-Path $ReleaseRoot 'production-isolation-private-runtime.cs'))
 $stub=@"
using System;using System.Diagnostics;using System.Security.Cryptography;using System.Text;
namespace HrMasterdata.Release {
 public static class Installation {internal const string ProjectRef="abcdefghijklmnopqrst";internal const string Root=@"$FixtureRoot";}
 internal static class ProtectedProductionIsolationCore {internal static void ContainSealProcess(Process child){throw new InvalidOperationException("synthetic_no_process");}}
 internal static class SyntheticDpapi {internal static byte[] Protect(byte[] plaintext,string entropy){byte[] bytes=Encoding.UTF8.GetBytes(entropy);try{return ProtectedData.Protect(plaintext,bytes,DataProtectionScope.CurrentUser);}finally{Array.Clear(bytes,0,bytes.Length);}}}
}
"@
 $provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateInMemory=$true;$parameters.GenerateExecutable=$false
 foreach($name in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($name)}
 try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]@($stub,$private));if($compiled.Errors.HasErrors){throw 'compile'}}finally{$provider.Dispose()}
 $stage='reflection'
 $type=$compiled.CompiledAssembly.GetType('HrMasterdata.Release.ProductionIsolationPrivateRuntime')
 $dpapiType=$compiled.CompiledAssembly.GetType('HrMasterdata.Release.SyntheticDpapi')
 $flags=[Reflection.BindingFlags]::NonPublic -bor [Reflection.BindingFlags]::Static
 $parse=$type.GetMethod('ParseLegacyApiKeys',$flags);$record=$type.GetMethod('ReadFixedRecord',$flags);$protected=$type.GetMethod('ReadProtectedRuntimeRecord',$flags);$protect=$dpapiType.GetMethod('Protect',$flags);$uri=$type.GetMethod('FixedApiKeyUri',$flags)
 function Require([bool]$ok){if(-not $ok){throw 'assertion'}}
 function Digest([byte[]]$bytes){$h=[Security.Cryptography.SHA256]::Create();try{return [BitConverter]::ToString($h.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
 function Jwt([string]$role,[string]$project){$payload=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((@{role=$role;ref=$project}|ConvertTo-Json -Compress))).TrimEnd('=').Replace('+','-').Replace('/','_');return 'synthetic.'+$payload+'.signature'}
 $project='abcdefghijklmnopqrst'
 $rows=@(@{name='anon';type='legacy';api_key=(Jwt 'anon' $project)},@{name='service_role';type='legacy';api_key=(Jwt 'service_role' $project)})
 $bytes=[Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $rows -Compress))
 $stage='positive-keys'
 $keys=$parse.Invoke($null,[object[]]@($bytes,$project));Require ($keys.Count -eq 2)
 $stage='negative-keys'
 $refusals=0
 foreach($bad in @(
  (@(@{name='anon';type='publishable';api_key=(Jwt 'anon' $project)},$rows[1])),
  (@(@{name='anon';type='legacy';api_key=(Jwt 'service_role' $project)},$rows[1])),
  (@(@{name='anon';type='legacy';api_key=(Jwt 'anon' 'uvwxyzabcdefghijklmn')},$rows[1])),
  (@($rows[0],$rows[0],$rows[1])),
  (@($rows[0]))
  )){
  $data=[Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $bad -Compress))
  try{$null=$parse.Invoke($null,[object[]]@($data,$project))}catch{$refusals++}
 }
 Require ($refusals -eq 5)
 $targetRefused=$false;try{$null=$uri.Invoke($null,[object[]]@('uvwxyzabcdefghijklmn'))}catch{$targetRefused=$true};Require $targetRefused
 $stage='record'
 $path=Join-Path $FixtureRoot 'synthetic-record.json';$raw=[Text.Encoding]::UTF8.GetBytes('{"count":0}')
 [IO.File]::WriteAllBytes($path,$raw)
 $stage='record-digest'
 $digest=Digest $raw
 $hashValid=($digest -cmatch '^[a-f0-9]{64}$');$hashMatch=($digest -ceq (Digest ([IO.File]::ReadAllBytes($path))))
 $stage='record-read'
 $valid=$record.Invoke($null,[object[]]@([string]$path,[string]$digest))
 $stage='record-assert'
 Require ($valid['count'] -eq 0)
 $recordRefused=$false;try{$null=$record.Invoke($null,[object[]]@([string]$path,[string]('b'*64)))}catch{$recordRefused=$true};Require $recordRefused
 $stage='protected-runtime'
 $runtimePath=Join-Path $FixtureRoot 'synthetic-runtime-record.dpapi.json'
 $runtimeEntropy='hr-masterdata/production/isolation-runtime/v1'
 $runtimePayload=[ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-record';controlAdmission=[ordered]@{marker='synthetic-control'};probeContext=[ordered]@{marker='synthetic-probe'}}
 function Encode-ProtectedRuntime([byte[]]$Plaintext,[string]$Entropy){
  $cipher=[byte[]]$protect.Invoke($null,[object[]]@($Plaintext,$Entropy))
  try{return [ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user';ciphertextBase64=[Convert]::ToBase64String($cipher)}}finally{[Array]::Clear($cipher,0,$cipher.Length)}
 }
 function Envelope-Bytes($Envelope){return [Text.Encoding]::UTF8.GetBytes(($Envelope|ConvertTo-Json -Compress -Depth 8))}
 function Invoke-ProtectedRuntime([byte[]]$Raw,[string]$Expected,[bool]$ExpectedSuccess){
  [IO.File]::WriteAllBytes($runtimePath,$Raw)
  try{
   $value=$protected.Invoke($null,[object[]]@([string]$runtimePath,[string]$Expected))
   if(-not $ExpectedSuccess){throw 'accepted'}
   Require ($value['kind'] -ceq 'protected-production-isolation-runtime-record' -and $value['controlAdmission']['marker'] -ceq 'synthetic-control' -and $value['probeContext']['marker'] -ceq 'synthetic-probe')
  }catch{
   if($ExpectedSuccess){throw}
   Require ($_.Exception.GetBaseException().Message -ceq 'Production isolation protected runtime record refused')
   return
  }
  if(-not $ExpectedSuccess){throw 'accepted'}
 }
 $runtimePlain=[Text.Encoding]::UTF8.GetBytes(($runtimePayload|ConvertTo-Json -Compress -Depth 8))
 try{
  $validEnvelope=Encode-ProtectedRuntime $runtimePlain $runtimeEntropy
  $validRuntimeBytes=Envelope-Bytes $validEnvelope
  Invoke-ProtectedRuntime $validRuntimeBytes (Digest $validRuntimeBytes) $true
  $protectedRuntimeRefusals=0
  function Refuse-ProtectedRuntime([string]$Name,[byte[]]$Raw,[string]$Expected){$script:stage='protected-runtime-'+$Name;Invoke-ProtectedRuntime $Raw $Expected $false;$script:protectedRuntimeRefusals++}
  $plaintextRuntime=Envelope-Bytes $runtimePayload;Refuse-ProtectedRuntime 'plaintext' $plaintextRuntime (Digest $plaintextRuntime)
  $wrongEntropy=Envelope-Bytes (Encode-ProtectedRuntime $runtimePlain 'hr-masterdata/production/isolation-runtime/wrong');Refuse-ProtectedRuntime 'wrong-entropy' $wrongEntropy (Digest $wrongEntropy)
  $damagedEnvelope=Encode-ProtectedRuntime $runtimePlain $runtimeEntropy;$damagedCipher=[Convert]::FromBase64String($damagedEnvelope.ciphertextBase64);$damagedCipher[0]=$damagedCipher[0] -bxor 1;$damagedEnvelope.ciphertextBase64=[Convert]::ToBase64String($damagedCipher);[Array]::Clear($damagedCipher,0,$damagedCipher.Length);$damaged=Envelope-Bytes $damagedEnvelope;Refuse-ProtectedRuntime 'damaged-ciphertext' $damaged (Digest $damaged)
  Refuse-ProtectedRuntime 'hash-mismatch' $validRuntimeBytes ('b'*64)
  $extra=[ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user';ciphertextBase64=$validEnvelope.ciphertextBase64;extra=$true};$extraBytes=Envelope-Bytes $extra;Refuse-ProtectedRuntime 'extra-envelope-field' $extraBytes (Digest $extraBytes)
  $missing=[ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user'};$missingBytes=Envelope-Bytes $missing;Refuse-ProtectedRuntime 'missing-envelope-field' $missingBytes (Digest $missingBytes)
  $badKind=[ordered]@{schemaVersion=1;kind='wrong';protection='dpapi-current-user';ciphertextBase64=$validEnvelope.ciphertextBase64};$badKindBytes=Envelope-Bytes $badKind;Refuse-ProtectedRuntime 'kind' $badKindBytes (Digest $badKindBytes)
  $badSchema=[ordered]@{schemaVersion=2;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user';ciphertextBase64=$validEnvelope.ciphertextBase64};$badSchemaBytes=Envelope-Bytes $badSchema;Refuse-ProtectedRuntime 'schema' $badSchemaBytes (Digest $badSchemaBytes)
  $badProtection=[ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='wrong';ciphertextBase64=$validEnvelope.ciphertextBase64};$badProtectionBytes=Envelope-Bytes $badProtection;Refuse-ProtectedRuntime 'protection' $badProtectionBytes (Digest $badProtectionBytes)
  $badBase64=[ordered]@{schemaVersion=1;kind='protected-production-isolation-runtime-ciphertext';protection='dpapi-current-user';ciphertextBase64=($validEnvelope.ciphertextBase64+'=')};$badBase64Bytes=Envelope-Bytes $badBase64;Refuse-ProtectedRuntime 'base64' $badBase64Bytes (Digest $badBase64Bytes)
  $nonUtf8Payload=[byte[]]@(255);$nonUtf8=Envelope-Bytes (Encode-ProtectedRuntime $nonUtf8Payload $runtimeEntropy);Refuse-ProtectedRuntime 'non-utf8-inner' $nonUtf8 (Digest $nonUtf8)
  $malformedPayload=[Text.Encoding]::UTF8.GetBytes('{');$malformed=Envelope-Bytes (Encode-ProtectedRuntime $malformedPayload $runtimeEntropy);Refuse-ProtectedRuntime 'malformed-inner' $malformed (Digest $malformed)
  $oversize=New-Object byte[] 65537;Refuse-ProtectedRuntime 'oversize' $oversize (Digest $oversize)
  Require ($protectedRuntimeRefusals -eq 13)
 }finally{
  if($null -ne $runtimePlain){[Array]::Clear($runtimePlain,0,$runtimePlain.Length)}
  if($null -ne $nonUtf8Payload){[Array]::Clear($nonUtf8Payload,0,$nonUtf8Payload.Length)}
  if($null -ne $malformedPayload){[Array]::Clear($malformedPayload,0,$malformedPayload.Length)}
  if($null -ne $oversize){[Array]::Clear($oversize,0,$oversize.Length)}
 }
 [ordered]@{compiled=$true;parserPassed=$true;keyRefusals=$refusals;targetRefusedBeforeCredentials=$true;recordHashRefused=$true;protectedRuntimeAccepted=$true;protectedRuntimeRefusals=$protectedRuntimeRefusals;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
}catch{
 $recordStage='unclassified'
 if($_.Exception.GetBaseException().Message -match '^Production isolation private record refused:(read|digest|decode|json)$'){$recordStage=$Matches[1]}
 [ordered]@{failed=$true;stage=$stage;recordStage=$recordStage;hashValid=$hashValid;hashMatch=$hashMatch;pathRooted=[IO.Path]::IsPathRooted($path);digestIsString=($digest -is [string]);exceptionType=$_.Exception.GetBaseException().GetType().Name}|ConvertTo-Json -Compress;exit 1
}
