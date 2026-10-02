param([string]$ReleaseRoot,[string]$FixtureRoot)
$ErrorActionPreference='Stop'
$stage='source'
try {
 $private=[IO.File]::ReadAllText((Join-Path $ReleaseRoot 'production-isolation-private-runtime.cs'))
 $stub=@"
using System;using System.Diagnostics;
namespace HrMasterdata.Release {
 public static class Installation {internal const string ProjectRef="abcdefghijklmnopqrst";internal const string Root=@"$FixtureRoot";}
 internal static class ProtectedProductionIsolationCore {internal static void ContainSealProcess(Process child){throw new InvalidOperationException("synthetic_no_process");}}
}
"@
 $provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateInMemory=$true;$parameters.GenerateExecutable=$false
 foreach($name in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($name)}
 try{$compiled=$provider.CompileAssemblyFromSource($parameters,[string[]]@($stub,$private));if($compiled.Errors.HasErrors){throw 'compile'}}finally{$provider.Dispose()}
 $stage='reflection'
 $type=$compiled.CompiledAssembly.GetType('HrMasterdata.Release.ProductionIsolationPrivateRuntime')
 $flags=[Reflection.BindingFlags]::NonPublic -bor [Reflection.BindingFlags]::Static
 $parse=$type.GetMethod('ParseLegacyApiKeys',$flags);$record=$type.GetMethod('ReadFixedRecord',$flags);$uri=$type.GetMethod('FixedApiKeyUri',$flags)
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
 [ordered]@{compiled=$true;parserPassed=$true;keyRefusals=$refusals;targetRefusedBeforeCredentials=$true;recordHashRefused=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
}catch{
 $recordStage='unclassified'
 if($_.Exception.GetBaseException().Message -match '^Production isolation private record refused:(read|digest|decode|json)$'){$recordStage=$Matches[1]}
 [ordered]@{failed=$true;stage=$stage;recordStage=$recordStage;hashValid=$hashValid;hashMatch=$hashMatch;pathRooted=[IO.Path]::IsPathRooted($path);digestIsString=($digest -is [string]);exceptionType=$_.Exception.GetBaseException().GetType().Name}|ConvertTo-Json -Compress;exit 1
}
