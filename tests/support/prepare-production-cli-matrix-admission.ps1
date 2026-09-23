param([switch]$ValidateInputOnly)

$ErrorActionPreference = 'Stop'

function Fail([string]$Code) { throw $Code }
function Need($Condition, [string]$Code) { if (-not $Condition) { Fail $Code } }
function Property($Object, [string]$Name, [string]$Code) {
  $value = $Object.PSObject.Properties[$Name]
  if ($null -eq $value) { Fail $Code }
  return $value.Value
}
function Require-ExactKeys($Object, [string[]]$Keys, [string]$Code) {
  Need ($null -ne $Object -and $Object -is [psobject]) $Code
  $actual = @($Object.PSObject.Properties.Name)
  Need ($actual.Count -eq $Keys.Count -and @($Keys | Where-Object { $_ -notin $actual }).Count -eq 0) $Code
}
function Require-AbsolutePath([string]$Value, [string]$Code) {
  Need (-not [string]::IsNullOrWhiteSpace($Value) -and $Value -match '^[A-Za-z]:[\\/]') $Code
  try { $full = [IO.Path]::GetFullPath($Value) } catch { Fail $Code }
  Need ($full -match '^[A-Za-z]:\\') $Code
  return $full
}
function Require-AbsoluteFile([string]$Value, [string]$Code) {
  $full = Require-AbsolutePath $Value $Code
  $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop
  Need (-not $item.PSIsContainer -and -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) $Code
  return $item.FullName
}
function Require-Sha256([string]$Value, [string]$Code) {
  Need ($Value -match '^[a-f0-9]{64}$') $Code
  return $Value
}
function File-Sha256([string]$Path) {
  $sha = [Security.Cryptography.SHA256]::Create()
  $stream = [IO.File]::OpenRead($Path)
  try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
  finally { $stream.Dispose(); $sha.Dispose() }
}
function Read-Tool($Object, [string]$Code) {
  Require-ExactKeys $Object @('executablePath', 'sha256') $Code
  $path = Require-AbsoluteFile ([string](Property $Object 'executablePath' $Code)) $Code
  $sha = Require-Sha256 ([string](Property $Object 'sha256' $Code)) $Code
  Need ((File-Sha256 $path) -eq $sha) $Code
  return [ordered]@{ executablePath = $path; sha256 = $sha }
}
function Select-GuardedComposeResource($Resources, [string]$ResourceId) {
  $selectedResources = @($Resources | Where-Object { $_.resourceId -eq $ResourceId })
  Need ($selectedResources.Count -eq 1) 'matrix_admission_guard_resource'
  $resource = $selectedResources[0]
  Need ($resource.owned -eq $true -and $resource.state -eq 'active' -and $resource.composeOperation.outcomeVerified -eq $true -and [string]$resource.composeOperation.guardProject -match '^[a-z0-9][a-z0-9_-]+$') 'matrix_admission_guard_resource'
  return $resource
}
function Require-IPv4DatabasePortMapping($Ports, [int]$Port) {
  try { $mappings = @($Ports.'5432/tcp') } catch { Fail 'matrix_admission_container' }
  Need ($mappings.Count -eq 1) 'matrix_admission_container'
  $mapping = $mappings[0]
  Need ([string]$mapping.HostIp -eq '127.0.0.1' -and [string]$mapping.HostPort -eq [string]$Port) 'matrix_admission_container'
  return $mapping
}
function Get-SystemIdentifierSha256([string]$SystemIdentifier) {
  Need ($SystemIdentifier -match '^[1-9][0-9]{0,18}$') 'matrix_admission_identity'
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($SystemIdentifier)))).Replace('-','').ToLowerInvariant()
  } finally { $sha.Dispose() }
}
function Require-OutputDirectoryOutsideWorkspace([string]$OutputDirectory, [string]$Workspace) {
  $output = Require-AbsolutePath $OutputDirectory 'matrix_admission_output'
  $source = Require-AbsolutePath $Workspace 'matrix_admission_output'
  $outputComparison = $output.TrimEnd([char[]]'\\/')
  $source = $source.TrimEnd([char[]]'\\/')
  $sourcePrefix = $source.TrimEnd([char[]]'\\/') + [IO.Path]::DirectorySeparatorChar
  Need (-not $outputComparison.Equals($source, [StringComparison]::OrdinalIgnoreCase) -and -not $outputComparison.StartsWith($sourcePrefix, [StringComparison]::OrdinalIgnoreCase)) 'matrix_admission_output'
  return $output
}

if ($MyInvocation.InvocationName -eq '.') { return }

try {
  $text = [Console]::In.ReadToEnd()
  Need (-not [string]::IsNullOrWhiteSpace($text)) 'matrix_admission_input'
  try { $request = $text | ConvertFrom-Json -ErrorAction Stop } catch { Fail 'matrix_admission_input' }
  Require-ExactKeys $request @('schemaVersion','resourceGuardContext','resourceId','database','source','tools','composeRecipePath','guardExecutable','dockerExecutable','outputDirectory') 'matrix_admission_input'
  Need ((Property $request 'schemaVersion' 'matrix_admission_input') -eq 1) 'matrix_admission_input'

  $context = Property $request 'resourceGuardContext' 'matrix_admission_input'
  Require-ExactKeys $context @('schemaVersion','sessionId','agentId') 'matrix_admission_input'
  Need ($context.schemaVersion -eq 1 -and [string]$context.sessionId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' -and ($null -eq $context.agentId -or [string]$context.agentId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')) 'matrix_admission_input'
  $resourceId = [string](Property $request 'resourceId' 'matrix_admission_input')
  Need ($resourceId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') 'matrix_admission_input'

  $database = Property $request 'database' 'matrix_admission_input'
  Require-ExactKeys $database @('port','password') 'matrix_admission_input'
  $port = Property $database 'port' 'matrix_admission_input'
  $password = [string](Property $database 'password' 'matrix_admission_input')
  Need (($port -is [int] -or $port -is [long]) -and $port -ge 1024 -and $port -le 65535 -and $password -match '^[a-f0-9]{32,64}$') 'matrix_admission_input'

  $source = Property $request 'source' 'matrix_admission_input'
  Require-ExactKeys $source @('workspace','commit','gitExecutable','expectedGitSha256') 'matrix_admission_input'
  $workspace = [string](Property $source 'workspace' 'matrix_admission_input')
  $workspace = Require-AbsolutePath $workspace 'matrix_admission_input'
  Need (Test-Path -LiteralPath $workspace -PathType Container) 'matrix_admission_input'
  $workspace = (Get-Item -LiteralPath $workspace -Force).FullName
  $commit = [string](Property $source 'commit' 'matrix_admission_input')
  Need ($commit -match '^[a-f0-9]{40}$') 'matrix_admission_input'
  $git = Require-AbsoluteFile ([string](Property $source 'gitExecutable' 'matrix_admission_input')) 'matrix_admission_input'
  $gitSha = Require-Sha256 ([string](Property $source 'expectedGitSha256' 'matrix_admission_input')) 'matrix_admission_input'
  Need ((File-Sha256 $git) -eq $gitSha) 'matrix_admission_input'
  $tools = Property $request 'tools' 'matrix_admission_input'
  Require-ExactKeys $tools @('cli','psql') 'matrix_admission_input'
  $cli = Read-Tool (Property $tools 'cli' 'matrix_admission_input') 'matrix_admission_tool'
  $psql = Read-Tool (Property $tools 'psql' 'matrix_admission_input') 'matrix_admission_tool'
  $recipe = Require-AbsoluteFile ([string](Property $request 'composeRecipePath' 'matrix_admission_input')) 'matrix_admission_input'
  $recipeSha = File-Sha256 $recipe
  $guard = Require-AbsoluteFile ([string](Property $request 'guardExecutable' 'matrix_admission_input')) 'matrix_admission_input'
  $docker = Require-AbsoluteFile ([string](Property $request 'dockerExecutable' 'matrix_admission_input')) 'matrix_admission_input'
  $outputDirectory = [string](Property $request 'outputDirectory' 'matrix_admission_input')
  $outputDirectory = Require-OutputDirectoryOutsideWorkspace $outputDirectory $workspace
  Need (Test-Path -LiteralPath $outputDirectory -PathType Container) 'matrix_admission_input'
  $outputDirectory = (Get-Item -LiteralPath $outputDirectory -Force).FullName
  Require-OutputDirectoryOutsideWorkspace $outputDirectory $workspace | Out-Null
  $admissionPath = Join-Path $outputDirectory 'matrix-admission.json'
  if ($ValidateInputOnly) {
    [pscustomobject]@{ validated = $true } | ConvertTo-Json -Compress
    exit 0
  }
  $actualCommit = ((& $git -C $workspace rev-parse HEAD) -join "`n").Trim()
  Need ($LASTEXITCODE -eq 0 -and $actualCommit -eq $commit) 'matrix_admission_source'

  $guardContext = [ordered]@{ schemaVersion = 1; sessionId = [string]$context.sessionId; agentId = $context.agentId }
  $body = [ordered]@{ resourceGuardContext = $guardContext } | ConvertTo-Json -Depth 8 -Compress
  $windowsPowerShell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $raw = $body | & $windowsPowerShell -NoProfile -NonInteractive -File $guard List -Product codex
  $nativeExitCode = $LASTEXITCODE
  try { $listed = ($raw -join "`n") | ConvertFrom-Json -ErrorAction Stop } catch { Fail 'matrix_admission_guard_list' }
  Need ($nativeExitCode -eq 0 -and $listed.ok -eq $true) 'matrix_admission_guard_list'
  $resource = Select-GuardedComposeResource $listed.data.resources $resourceId

  $containerIds = @(& $docker ps --filter ('label=com.docker.compose.project=' + $resource.composeOperation.guardProject) --filter 'label=com.docker.compose.service=db' --format '{{.ID}}')
  Need ($LASTEXITCODE -eq 0 -and $containerIds.Count -eq 1 -and $containerIds[0] -match '^[a-f0-9]{12,64}$') 'matrix_admission_container'
  $containerId = $containerIds[0]
  $inspectRaw = (& $docker inspect $containerId --format '{{json .NetworkSettings.Ports}}') -join "`n"
  $inspectExitCode = $LASTEXITCODE
  try { $ports = $inspectRaw | ConvertFrom-Json -ErrorAction Stop } catch { Fail 'matrix_admission_container' }
  Need ($inspectExitCode -eq 0) 'matrix_admission_container'
  Require-IPv4DatabasePortMapping $ports $port | Out-Null
  $system = ((& $docker exec $containerId psql -X -q -t -A -U postgres -d postgres -c 'SELECT system_identifier::text FROM pg_control_system()') -join "`n").Trim()
  Need ($LASTEXITCODE -eq 0) 'matrix_admission_identity'
  $systemHash = Get-SystemIdentifierSha256 $system
  $system = $null

  $binding = [ordered]@{ owned = $true; verified = $true; resourceId = $resourceId; expectedSystemIdentifierSha256 = $systemHash; composeSha256 = $recipeSha; port = [int]$port; password = $password; observedAtUtc = [DateTime]::UtcNow.ToString('o') }
  $admission = [ordered]@{ sourceOptions = [ordered]@{ workspace = $workspace; commit = $commit; gitExecutable = $git; expectedGitSha256 = $gitSha }; guardBinding = $binding; cli = $cli; psql = $psql; outputDirectory = $outputDirectory }
  $bytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes(($admission | ConvertTo-Json -Depth 8))
  try {
    $stream = New-Object IO.FileStream($admissionPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
  } catch { Fail 'matrix_admission_output_exists' }
  [pscustomobject]@{ prepared = $true; admissionPath = $admissionPath; resourceId = $resourceId } | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('CLI matrix admission preparation failed')
  exit 1
}
