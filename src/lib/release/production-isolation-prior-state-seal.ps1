Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
# This file is dot-sourced only by the fixed, compiled production-isolation
# host. The host supplies byte arrays from its signed stdin transport; it does
# not accept an output path, URL, credential, or transport from that packet.
function New-ProductionIsolationRestrictedSecurity {
  param([bool]$Directory)
  $security = if ($Directory) { New-Object Security.AccessControl.DirectorySecurity } else { New-Object Security.AccessControl.FileSecurity }
  $security.SetAccessRuleProtection($true, $false)
  $current = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = New-Object Security.Principal.SecurityIdentifier([Security.Principal.WellKnownSidType]::LocalSystemSid, $null)
  $administrators = New-Object Security.Principal.SecurityIdentifier([Security.Principal.WellKnownSidType]::BuiltinAdministratorsSid, $null)
  $security.SetOwner($current)
  foreach ($sid in @($current, $system, $administrators)) {
    $security.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid, [Security.AccessControl.FileSystemRights]::FullControl, [Security.AccessControl.AccessControlType]::Allow)))
  }
  return $security
}

function Invoke-ProductionIsolationPriorStateSeal {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][byte[]]$ContextUtf8,
    [Parameter(Mandatory = $true)][byte[]]$PriorStateUtf8
  )

  $ciphertext = $null
  $plaintext = $null
  $entropy = $null
  $stream = $null
  $stage = 'schema'
  try {
    if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or
      $ContextUtf8.Length -gt 4096 -or $PriorStateUtf8.Length -eq 0 -or $PriorStateUtf8.Length -gt 65536) { throw 'refused' }
    $utf8 = New-Object Text.UTF8Encoding($false, $true)
    $contextText = $utf8.GetString($ContextUtf8)
    $priorText = $utf8.GetString($PriorStateUtf8)
    foreach ($name in @('sourceSha','targetBindingSha256','isolationPlanSha256')) {
      if ([regex]::Matches($contextText, '"' + $name + '"\s*:').Count -ne 1) { throw 'refused' }
    }
    foreach ($name in @('auth','networkRestrictions','postgrest','realtime')) {
      if ([regex]::Matches($priorText, '"' + $name + '"\s*:').Count -ne 1) { throw 'refused' }
    }
    $context = $contextText | ConvertFrom-Json
    if ((@($context.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'isolationPlanSha256,sourceSha,targetBindingSha256' -or
      $context.sourceSha -cnotmatch '^[a-f0-9]{40}$' -or $context.targetBindingSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $context.isolationPlanSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $context.sourceSha -isnot [string] -or $context.targetBindingSha256 -isnot [string] -or $context.isolationPlanSha256 -isnot [string]) { throw 'refused' }
    $prior = $priorText | ConvertFrom-Json
    if ((@($prior.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'auth,networkRestrictions,postgrest,realtime') { throw 'refused' }
    foreach ($name in @('auth','networkRestrictions','postgrest','realtime')) {
      if ($null -eq $prior.$name -or $prior.$name -isnot [pscustomobject]) { throw 'refused' }
    }

    $stage = 'root-integrity'
    # Installation is compiled into the private host. This module deliberately
    # contains no caller-selectable destination and refuses an absent contract.
    $root = [IO.Path]::GetFullPath([HrMasterdata.Release.Installation]::PriorStateRoot)
    if (-not [IO.Path]::IsPathRooted($root)) { throw 'refused' }
    if (-not (Test-Path -LiteralPath $root)) { $null = [IO.Directory]::CreateDirectory($root, (New-ProductionIsolationRestrictedSecurity $true)) }
    if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw 'refused' }
    $walk = $root
    while ($true) {
      if (([IO.File]::GetAttributes($walk) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'refused' }
      $parent = [IO.Directory]::GetParent($walk)
      if ($null -eq $parent) { break }; $walk = $parent.FullName
    }
    # Existing directories are inspected, never repaired. An untrusted writer
    # with DeleteChild could otherwise remove an immutable ciphertext file.
    $currentSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $trustedSids=@($currentSid,'S-1-5-18','S-1-5-32-544')
    $directorySecurity=[IO.Directory]::GetAccessControl($root)
    if($directorySecurity.GetOwner([Security.Principal.SecurityIdentifier]).Value -cnotin $trustedSids){throw 'refused'}
    $descriptor=New-Object Security.AccessControl.RawSecurityDescriptor($directorySecurity.GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::All))
    if($null -eq $descriptor.DiscretionaryAcl){throw 'refused'}
    $mutationRights=0x2 -bor 0x4 -bor 0x10 -bor 0x40 -bor 0x100 -bor 0x10000 -bor 0x40000 -bor 0x80000
    foreach($rule in $directorySecurity.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){
      if($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
        $rule.IdentityReference.Value -cnotin $trustedSids -and
        (([int]$rule.FileSystemRights -band $mutationRights) -ne 0)){throw 'refused'}
    }
    $bindingBytes = [Text.Encoding]::UTF8.GetBytes($context.sourceSha + '|' + $context.targetBindingSha256 + '|' + $context.isolationPlanSha256)
    $bindingHash = [Security.Cryptography.SHA256]::Create()
    try { $bindingSha256 = ([BitConverter]::ToString($bindingHash.ComputeHash($bindingBytes))).Replace('-', '').ToLowerInvariant() } finally { $bindingHash.Dispose(); [Array]::Clear($bindingBytes, 0, $bindingBytes.Length) }
    $name = 'production-isolation-prior-state-' + $bindingSha256 + '.dpapi'
    $destination = Join-Path $root $name
    if ([IO.Path]::GetFullPath($destination) -ne (Join-Path $root $name)) { throw 'refused' }

    $stage = 'encrypt'
    $entropy = [Text.Encoding]::UTF8.GetBytes($context.sourceSha + '|' + $context.targetBindingSha256 + '|' + $context.isolationPlanSha256)
    $ciphertext = [Security.Cryptography.ProtectedData]::Protect($PriorStateUtf8, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    $stage = 'atomic-create'
    $fileSecurity = New-ProductionIsolationRestrictedSecurity $false
    $stream = New-Object IO.FileStream($destination, [IO.FileMode]::CreateNew, [Security.AccessControl.FileSystemRights]::Write, [IO.FileShare]::None, 4096, [IO.FileOptions]::WriteThrough, $fileSecurity)
    $stream.Write($ciphertext, 0, $ciphertext.Length); $stream.Flush($true); $stream.Dispose(); $stream = $null
    $stage = 'self-test'
    $plaintext = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($destination), $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    if ($plaintext.Length -ne $PriorStateUtf8.Length) { throw 'refused' }
    for ($index = 0; $index -lt $plaintext.Length; $index++) { if ($plaintext[$index] -ne $PriorStateUtf8[$index]) { throw 'refused' } }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $cipherSha256 = ([BitConverter]::ToString($sha.ComputeHash($ciphertext))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
    [ordered]@{ schemaVersion = 1; kind = 'production-isolation-prior-state-sealed'; sourceSha = $context.sourceSha; targetBindingSha256 = $context.targetBindingSha256; isolationPlanSha256 = $context.isolationPlanSha256; capturedAtUtc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ', [Globalization.CultureInfo]::InvariantCulture); encrypted = $true; immutable = $true; ciphertextSha256 = $cipherSha256 } | ConvertTo-Json -Compress
  } catch { throw ('production_isolation_prior_state_seal_refused:' + $stage) }
  finally {
    if ($null -ne $stream) { $stream.Dispose() }
    if ($null -ne $ciphertext) { [Array]::Clear($ciphertext, 0, $ciphertext.Length) }
    if ($null -ne $plaintext) { [Array]::Clear($plaintext, 0, $plaintext.Length) }
    if ($null -ne $entropy) { [Array]::Clear($entropy, 0, $entropy.Length) }
    [Array]::Clear($ContextUtf8, 0, $ContextUtf8.Length)
    [Array]::Clear($PriorStateUtf8, 0, $PriorStateUtf8.Length)
  }
}
