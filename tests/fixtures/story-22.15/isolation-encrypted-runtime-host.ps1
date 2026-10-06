param([string]$ReleaseRoot,[string]$FixtureRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
[IO.Directory]::SetAccessControl($FixtureRoot,$acl)
$installed=Join-Path $FixtureRoot 'installed'
foreach($relative in @('installed/runtime','installed/src/lib/release','source/src/lib/release','runtime/node_modules/synthetic','private','tools')){
 $null=[IO.Directory]::CreateDirectory((Join-Path $FixtureRoot $relative))
}
function Compile-Fixture([string]$Output,[string[]]$Files,[string]$Entry){
 $provider=New-Object Microsoft.CSharp.CSharpCodeProvider
 $parameters=New-Object CodeDom.Compiler.CompilerParameters
 $parameters.GenerateExecutable=$true;$parameters.OutputAssembly=$Output
 $parameters.CompilerOptions='/optimize+ /platform:x64 /main:'+ $Entry
 foreach($name in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($name)}
 try{$result=$provider.CompileAssemblyFromFile($parameters,$Files);if($result.Errors.HasErrors){throw 'synthetic-host-compile'}}finally{$provider.Dispose()}
}
$nodeSource=Join-Path $FixtureRoot 'fake-node.cs'
[IO.File]::WriteAllText($nodeSource,@'
using System;using System.IO;using System.Reflection;
internal static class SyntheticNode {
 internal static int Main(string[] args){
  string installed=Directory.GetParent(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)).FullName;
  File.WriteAllText(Path.Combine(installed,"node-started"),"synthetic");
  Console.WriteLine("{\"kind\":\"protected-production-isolation-ready\",\"nonce\":\""+new string('a',64)+"\"}");
  Console.ReadLine();return 1;
 }
}
'@,(New-Object Text.UTF8Encoding($false)))
Compile-Fixture (Join-Path $installed 'runtime/node.exe') @($nodeSource) 'SyntheticNode'
foreach($relative in @('installed/src/lib/release/protected-production-isolation-worker.mjs','source/src/lib/release/production-isolation-live-adapter.mjs','runtime/node_modules/synthetic/index.js','tools/git.exe','tools/psql.exe')){
 [IO.File]::WriteAllText((Join-Path $FixtureRoot $relative),'synthetic-never-executed',(New-Object Text.UTF8Encoding($false)))
}
# Hash-valid legacy plaintext is synthetic and deliberately must be refused.
[IO.File]::WriteAllText((Join-Path $FixtureRoot 'private/runtime.json'),'{"schemaVersion":1,"kind":"protected-production-isolation-runtime-record","controlAdmission":{},"probeContext":{}}',(New-Object Text.UTF8Encoding($false)))
$installationSource=Join-Path $FixtureRoot 'installation.cs'
[IO.File]::WriteAllText($installationSource,@'
using System;using System.Collections.Generic;using System.IO;using System.Reflection;using System.Security.Cryptography;
namespace HrMasterdata.Release {
internal static class Installation {
 internal static readonly string Root=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
 static readonly string Fixture=Directory.GetParent(Root).FullName;
 internal static readonly string CleanSourceRoot=Path.Combine(Fixture,"source"),RuntimeRoot=Path.Combine(Fixture,"runtime"),PrivilegedRoot=Path.Combine(Fixture,"private");
 internal static readonly string NodeExecutable=Path.Combine(Root,"runtime","node.exe");
 internal const string SourceCommit="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",ProjectRef="abcdefghijklmnopqrst",TargetBindingSha256="dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",IsolationPlanSha256="eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",OriginPrivateKey="synthetic-not-used";
 internal static readonly IDictionary<string,string> InstallationFiles=Map(Root,"runtime/node.exe","src/lib/release/protected-production-isolation-worker.mjs");
 internal static readonly IDictionary<string,string> SourceFiles=Map(CleanSourceRoot,"src/lib/release/production-isolation-live-adapter.mjs");
 internal static readonly IDictionary<string,string> RuntimeFiles=Map(RuntimeRoot,"node_modules/synthetic/index.js");
 internal static readonly IDictionary<string,string> PrivilegedFiles=Map(PrivilegedRoot,"runtime.json");
 internal static readonly string WorkerSha256=InstallationFiles["src/lib/release/protected-production-isolation-worker.mjs"],LiveAdapterSha256=SourceFiles["src/lib/release/production-isolation-live-adapter.mjs"];
 internal sealed class LeaseGroup {internal string Root;internal IDictionary<string,string> Files;internal LeaseGroup(string root,IDictionary<string,string> files){Root=root;Files=files;}}
 internal static readonly LeaseGroup[] ToolGroups=new[]{new LeaseGroup(Path.Combine(Fixture,"tools"),Map(Path.Combine(Fixture,"tools"),"git.exe","psql.exe"))};
 static string Hash(string path){using(var sha=SHA256.Create())using(var stream=File.OpenRead(path))return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
 static IDictionary<string,string> Map(string root,params string[] files){var map=new Dictionary<string,string>();foreach(string file in files)map.Add(file,Hash(Path.Combine(root,file)));return map;}
 static void Marker(string name){File.WriteAllText(Path.Combine(Root,name),"synthetic");}
 internal static string InputRoot {get{Marker("input-accessed");throw new InvalidOperationException("synthetic-no-inputs");}}
 internal static object ReadIsolationAdmission(){return new Dictionary<string,object>{{"sourceCommit",SourceCommit},{"sourceTree",new string('b',40)},{"sourceManifestSha256",new string('c',64)},{"approvedPackageSha256",new string('1',64)},{"rawModuleSha256",WorkerSha256},{"toolchainSha256",new string('3',64)},{"targetBindingSha256",TargetBindingSha256},{"tlsAdmissionSha256",new string('4',64)},{"egressAdmissionSha256",new string('5',64)},{"isolationPlanSha256",IsolationPlanSha256},{"managementApiCapabilitySha256",new string('6',64)}};}
 internal static object ReadRuntimeRecord(){Marker("runtime-read");return ProductionIsolationPrivateRuntime.ReadProtectedRuntimeRecord(Path.Combine(PrivilegedRoot,"runtime.json"),PrivilegedFiles["runtime.json"]);}
 internal static object ReadSourceOptions(){return new {commit=SourceCommit,gitExecutable=Path.Combine(Fixture,"tools","git.exe"),expectedGitSha256=ToolGroups[0].Files["git.exe"]};}
 internal static object ReadPsqlTool(){return new {psqlExecutable=Path.Combine(Fixture,"tools","psql.exe"),expectedPsqlSha256=ToolGroups[0].Files["psql.exe"],expectedPsqlVersion="psql synthetic"};}
 internal static string ReadManagementApiToken(){Marker("api-accessed");throw new InvalidOperationException("synthetic-no-api");}
 internal static string ReadAnonymousKey(string project){return ReadManagementApiToken();}
 internal static string ReadServiceRoleKey(string project){return ReadManagementApiToken();}
 internal static object SealIsolationPriorState(string context,string prior){throw new InvalidOperationException("synthetic-no-seal");}
 }
}
'@,(New-Object Text.UTF8Encoding($false)))
$units=@('protected-file-lease.cs','protected-production-inputs.cs','production-isolation-private-runtime.cs','protected-production-isolation-core.cs','protected-production-isolation-host.cs')|ForEach-Object{Join-Path $ReleaseRoot $_}
$units+=$installationSource
$hostPath=Join-Path $installed 'production-isolation.exe'
Compile-Fixture $hostPath $units 'HrMasterdata.Release.ProtectedProductionIsolationHost'
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$hostPath;$start.WorkingDirectory=$installed;$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
$child=New-Object Diagnostics.Process;$child.StartInfo=$start
try{
 if(-not $child.Start()){throw 'synthetic-host-start'}
 $out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync()
 if(-not $child.WaitForExit(15000)){$child.Kill();throw 'synthetic-host-timeout'}
 if($child.ExitCode -ne 1 -or $out.Result.Length -ne 0 -or $err.Result.Trim() -cne 'Protected production isolation did not complete. Production remains paused.'){throw 'synthetic-host-result'}
 $runtimeReached=Test-Path -LiteralPath (Join-Path $installed 'runtime-read')
 $nodeStarted=Test-Path -LiteralPath (Join-Path $installed 'node-started')
 $inputAccessed=Test-Path -LiteralPath (Join-Path $installed 'input-accessed')
 $apiAccessed=Test-Path -LiteralPath (Join-Path $installed 'api-accessed')
 if(-not $runtimeReached -or $nodeStarted -or $inputAccessed -or $apiAccessed){throw 'synthetic-host-boundary'}
 [ordered]@{actualHostExecuted=$true;heldLeaseStagePassed=$true;runtimeReadReached=$true;plaintextRefused=$true;workerStarted=$false;inputAccessorReached=$false;apiAccessorReached=$false;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Compress
}finally{$child.Dispose()}
