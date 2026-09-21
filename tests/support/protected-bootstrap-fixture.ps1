param([Parameter(Mandatory=$true)][string]$Workspace,[Parameter(Mandatory=$true)][string]$NodeExecutable)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ps=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$results=New-Object 'System.Collections.Generic.List[object]'
function Check([string]$Name,[scriptblock]$Body){try{& $Body;$results.Add(@{name=$Name;passed=$true})}catch{$results.Add(@{name=$Name;passed=$false})}}
function Rejected([scriptblock]$Body){$denied=$false;try{& $Body}catch{$denied=$true};if(-not $denied){throw 'not denied'}}
function Digest([byte[]]$Bytes){$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
$fixture=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-bootstrap-test-'+[Guid]::NewGuid().ToString('N'))
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($owner);$acl.SetAccessRuleProtection($true,$false)
foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
$null=[IO.Directory]::CreateDirectory($fixture,$acl)
$package=Join-Path $fixture 'package';$null=[IO.Directory]::CreateDirectory($package)
$paths=@('node_modules/papaparse/package.json','node_modules/papaparse/papaparse.js','runtime/node.exe','runtime/supabase.exe','src/lib/release/protected-bootstrap-host.cs','src/lib/release/protected-bootstrap-worker.mjs','src/lib/release/protected-file-lease.cs','supabase/verify/run-reviewed-supabase-cli.mjs','supabase/verify/verify-production-baseline-catalog.mjs','supabase/verify/verify-target-binding.mjs')
foreach($relative in $paths){
 $destination=Join-Path $package $relative;$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
 if($relative -eq 'runtime/supabase.exe'){continue}
 $source=if($relative -eq 'runtime/node.exe'){$NodeExecutable}else{Join-Path $Workspace $relative}
 [IO.File]::Copy($source,$destination,$false)
}
$marker=Join-Path $fixture 'cli-calls.txt'
$fake='using System; using System.IO; class FakeCli { static int Main(string[] args) { if(args.Length!=1 || args[0]!="--version")return 33; foreach(string key in new[]{"NODE_OPTIONS","NODE_PATH","PGPASSWORD","SUPABASE_DB_URL","BOOTSTRAP_APPROVED"})if(Environment.GetEnvironmentVariable(key)!=null)return 34; File.AppendAllText(@"'+$marker.Replace('"','""')+'","called\n");System.Threading.Thread.Sleep(500);Console.WriteLine("2.115.0");return 0; } }'
Add-Type -TypeDefinition $fake -OutputAssembly (Join-Path $package 'runtime/supabase.exe') -OutputType ConsoleApplication
$entries=@($paths|ForEach-Object {[ordered]@{path=$_;sha256=Digest ([IO.File]::ReadAllBytes((Join-Path $package $_)))}})
$manifest=[ordered]@{schemaVersion=1;kind='offline-protected-toolchain-package';sourceCommit=('a'*40);sourceTree=('b'*40);files=$entries}
$manifestFile=Join-Path $package 'toolchain-package.json'
function Write-Manifest($Value){[IO.File]::WriteAllText($manifestFile,($Value|ConvertTo-Json -Depth 8 -Compress),(New-Object Text.UTF8Encoding($false)));return Digest ([IO.File]::ReadAllBytes($manifestFile))}
$digest=Write-Manifest $manifest
$installer=Join-Path $Workspace 'src/lib/release/install-protected-toolchain.ps1'
function Install([string]$Hash){
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=$ps;$info.Arguments='-NoProfile -NonInteractive -File "'+$installer+'" -PackageDirectory "'+$package+'" -ExpectedPackageSha256 '+$Hash
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $p=[Diagnostics.Process]::Start($info)
 try{if(-not $p.WaitForExit(30000)){throw 'install timeout'};return @{status=$p.ExitCode;output=$p.StandardOutput.ReadToEnd();error=$p.StandardError.ReadToEnd()}}finally{if(-not $p.HasExited){$p.Kill();$p.WaitForExit(5000)|Out-Null};$p.Dispose()}
}
Check 'external-package-digest-mismatch' {if((Install ('0'*64)).status -eq 0){throw 'accepted'}}
Check 'omitted-closure-file' {$saved=$manifest.files;try{$manifest.files=@($entries|Select-Object -Skip 1);$bad=Write-Manifest $manifest;if((Install $bad).status -eq 0){throw 'accepted'}}finally{$manifest.files=$saved;$null=Write-Manifest $manifest}}
Check 'duplicate-closure-file' {$saved=$manifest.files;try{$manifest.files=@($entries[0])+$entries;$bad=Write-Manifest $manifest;if((Install $bad).status -eq 0){throw 'accepted'}}finally{$manifest.files=$saved;$null=Write-Manifest $manifest}}
Check 'changed-package-file' {$file=Join-Path $package 'node_modules/papaparse/papaparse.js';$bytes=[IO.File]::ReadAllBytes($file);try{[IO.File]::AppendAllText($file,'changed');if((Install $digest).status -eq 0){throw 'accepted'}}finally{[IO.File]::WriteAllBytes($file,$bytes)}}
$installed=Install $digest
if($installed.status -ne 0){throw ('fixture installation failed: '+$installed.output)}
$root=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.hr-masterdata-toolchain-'+$digest)
$exe=Join-Path $root 'bootstrap.exe'
function Count-Calls {if(Test-Path -LiteralPath $marker){return @([IO.File]::ReadAllLines($marker)).Count};return 0}
function Start-Host([string]$Arguments=''){
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=$exe;$info.Arguments=$Arguments;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 foreach($key in @('NODE_OPTIONS','NODE_PATH','PGPASSWORD','SUPABASE_DB_URL','BOOTSTRAP_APPROVED')){$info.EnvironmentVariables[$key]='synthetic-untrusted-value'}
 return [Diagnostics.Process]::Start($info)
}
function Finish($Child){try{if(-not $Child.WaitForExit(45000)){throw 'timeout'};return @{status=$Child.ExitCode;output=$Child.StandardOutput.ReadToEnd();error=$Child.StandardError.ReadToEnd()}}finally{if(-not $Child.HasExited){$Child.Kill();$Child.WaitForExit(5000)|Out-Null};$Child.Dispose()}}
Check 'installer-does-not-spawn-cli' {if((Count-Calls) -ne 0){throw 'spawned'}}
Check 'existing-installation-not-overwritten' {if((Install $digest).status -eq 0){throw 'overwritten'}}
Check 'runtime-arguments-refused-before-cli' {$before=Count-Calls;$r=Finish (Start-Host '--production');if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}
$child=Start-Host
try{
 $deadline=[DateTime]::UtcNow.AddSeconds(15)
 while((Count-Calls) -eq 0 -and -not $child.HasExited -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 20}
 if((Count-Calls) -eq 0){throw ('cli did not start: '+$child.StandardError.ReadToEnd())}
 Check 'runtime-file-write-blocked' {Rejected {$s=[IO.File]::Open((Join-Path $root 'runtime/node.exe'),'Open','Write','ReadWrite');$s.Dispose()}}
 Check 'cli-file-replacement-blocked' {Rejected {[IO.File]::Move((Join-Path $root 'runtime/supabase.exe'),(Join-Path $root 'runtime/replaced.exe'))}}
 Check 'worker-file-write-blocked' {Rejected {$s=[IO.File]::Open((Join-Path $root 'src/lib/release/protected-bootstrap-worker.mjs'),'Open','Write','ReadWrite');$s.Dispose()}}
 Check 'dependency-file-replacement-blocked' {Rejected {[IO.File]::Move((Join-Path $root 'node_modules/papaparse/papaparse.js'),(Join-Path $root 'node_modules/papaparse/replaced.js'))}}
 Check 'installation-directory-replacement-blocked' {Rejected {[IO.Directory]::Move($root,($root+'-moved'))}}
 $result=Finish $child;$child=$null
 Check 'real-reviewed-wrapper-version-handshake' {if($result.status -ne 0 -or $result.output.Trim() -ne '{"verifiedToolchain":true,"hostedAccess":false,"privateInputsLoaded":false}'){throw 'version failed'}}
 Check 'ambient-loader-and-target-settings-stripped' {if($result.status -ne 0 -or (Count-Calls) -ne 2){throw 'environment leaked'}}
}finally{if($null -ne $child){$null=Finish $child}}
$worker=Join-Path $root 'src/lib/release/protected-bootstrap-worker.mjs'
Check 'completed-host-releases-lease' {$s=[IO.File]::Open($worker,'Open','Write','Read');$s.Dispose()}
Check 'preexisting-writer-refused-before-cli' {$before=Count-Calls;$s=[IO.File]::Open($worker,'Open','Write','ReadWrite,Delete');try{$r=Finish (Start-Host);if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{$s.Dispose()}}
Check 'tampered-module-refused-before-cli' {$before=Count-Calls;$bytes=[IO.File]::ReadAllBytes($worker);try{[IO.File]::AppendAllText($worker,'tampered');$r=Finish (Start-Host);if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}finally{[IO.File]::WriteAllBytes($worker,$bytes)}}
Check 'copied-launcher-refused' {$copy=Join-Path $fixture 'copied.exe';[IO.File]::Copy($exe,$copy);$old=$exe;try{$exe=$copy;$r=Finish (Start-Host);if($r.status -eq 0){throw 'accepted'}}finally{$exe=$old}}
foreach($case in @('wrong-nonce','extra-packet-field','apply-operation','malformed-packet')){
 Check $case {
  $before=Count-Calls;$info=New-Object Diagnostics.ProcessStartInfo
  $info.FileName=$NodeExecutable;$info.Arguments='--no-addons "'+$worker+'"';$info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $process=[Diagnostics.Process]::Start($info)
  try{
   $ready=$process.StandardOutput.ReadLineAsync();if(-not $ready.Wait(5000)){throw 'ready'};$nonce=($ready.Result|ConvertFrom-Json).nonce
   $packet=@{schemaVersion=1;nonce=$nonce;operation='verify-toolchain'}
   switch($case){'wrong-nonce'{$packet.nonce='0'*64};'extra-packet-field'{$packet.approvalAttested=$true};'apply-operation'{$packet.operation='apply'}}
   $payload=if($case -eq 'malformed-packet'){'{'}else{$packet|ConvertTo-Json -Compress}
   $process.StandardInput.Write($payload);$process.StandardInput.Close()
   $r=Finish $process;$process=$null
   if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}
  }finally{if($null -ne $process){$null=Finish $process}}
 }
}
Check 'unexpected-directory-refused-before-cli' {$before=Count-Calls;$null=[IO.Directory]::CreateDirectory((Join-Path $root 'unexpected'));$r=Finish (Start-Host);if($r.status -eq 0 -or (Count-Calls) -ne $before){throw 'accepted'}}
[ordered]@{cases=@($results.ToArray());syntheticOnly=$true;fixtureRetained=$true;hostedAccess=$false;privateInputsLoaded=$false}|ConvertTo-Json -Depth 5 -Compress
if(@($results|Where-Object {-not $_.passed}).Count){exit 1}
