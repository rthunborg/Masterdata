$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'prepare-production-cli-matrix-admission.ps1')

function Assert-True($Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}
function Assert-Fails([scriptblock]$Action, [string]$Message) {
  try { & $Action } catch { return }
  throw $Message
}
function New-Resource([bool]$Owned = $true, [string]$State = 'active', [bool]$Verified = $true, [string]$Project = 'matrix-local') {
  return [pscustomobject]@{
    resourceId = '00000000-0000-0000-0000-000000000001'
    owned = $Owned
    state = $State
    composeOperation = [pscustomobject]@{
      outcomeVerified = $Verified
      guardProject = $Project
    }
  }
}
function New-Ports([string]$HostIp = '127.0.0.1', [string]$HostPort = '27442', [int]$Count = 1) {
  $mappings = @()
  for ($index = 0; $index -lt $Count; $index++) {
    $mappings += [pscustomobject]@{ HostIp = $HostIp; HostPort = $HostPort }
  }
  return @{ '5432/tcp' = $mappings }
}

$id = '00000000-0000-0000-0000-000000000001'
$selected = Select-GuardedComposeResource @(New-Resource) $id
Assert-True ($selected.resourceId -eq $id) 'valid guard resource was not selected'
Assert-Fails { Select-GuardedComposeResource @((New-Resource -Owned $false)) $id } 'unowned resource was accepted'
Assert-Fails { Select-GuardedComposeResource @((New-Resource -State 'starting')) $id } 'non-active resource was accepted'
Assert-Fails { Select-GuardedComposeResource @((New-Resource -Verified $false)) $id } 'unverified compose outcome was accepted'
Assert-Fails { Select-GuardedComposeResource @((New-Resource), (New-Resource)) $id } 'ambiguous resource selection was accepted'

$mapping = Require-IPv4DatabasePortMapping (New-Ports) 27442
Assert-True ($mapping.HostIp -eq '127.0.0.1') 'valid IPv4 mapping was not selected'
Assert-Fails { Require-IPv4DatabasePortMapping (New-Ports -HostIp '::1') 27442 } 'IPv6 mapping was accepted'
Assert-Fails { Require-IPv4DatabasePortMapping (New-Ports -HostPort '27443') 27442 } 'wrong host port was accepted'
Assert-Fails { Require-IPv4DatabasePortMapping (New-Ports -Count 2) 27442 } 'multiple mappings were accepted'

$hash = Get-SystemIdentifierSha256 '7612345678901234567'
Assert-True ($hash -match '^[a-f0-9]{64}$') 'valid system identifier was not hashed'
foreach ($value in @('', '0', '0123', 'not-an-identifier', '12345678901234567890')) {
  Assert-Fails { Get-SystemIdentifierSha256 $value } "invalid system identifier was accepted: $value"
}

$outside = Require-OutputDirectoryOutsideWorkspace 'C:\matrix-output' 'C:\workspace\source'
Assert-True ($outside -eq 'C:\matrix-output') 'outside output directory was rejected'
Assert-Fails { Require-OutputDirectoryOutsideWorkspace 'C:\workspace\source' 'C:\workspace\source' } 'source output directory was accepted'
Assert-Fails { Require-OutputDirectoryOutsideWorkspace 'C:\workspace\source\matrix' 'C:\workspace\source' } 'descendant output directory was accepted'
Assert-Fails { Require-OutputDirectoryOutsideWorkspace 'C:\workspace\source' 'C:\workspace\source\' } 'trailing source separator bypass was accepted'
Assert-Fails { Require-OutputDirectoryOutsideWorkspace 'C:\WORKSPACE\source\..\source\matrix' 'C:\workspace\source' } 'normalized descendant was accepted'

Write-Output 'prepare-production-cli-matrix-admission regression checks passed'
