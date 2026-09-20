param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
  if ($PSVersionTable.PSEdition -cne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5) { throw 'runtime' }
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  if ($request.operation -cnotin @('create', 'verify')) { throw 'operation' }
  $root = [IO.Path]::GetFullPath([string]$request.root)
  $destination = [IO.Path]::GetFullPath([string]$request.destination)
  if ([IO.Path]::GetDirectoryName($destination) -cne $root -or $destination -ceq $root) { throw 'boundary' }
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $trusted = @($owner.Value, 'S-1-5-18', 'S-1-5-32-544')
  function Assert-NoReparse([string]$Path) {
    $current = $Path
    while ($current) {
      if (Test-Path -LiteralPath $current) {
        $item = Get-Item -LiteralPath $current -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'reparse' }
      }
      $parent = [IO.Path]::GetDirectoryName($current)
      if ($parent -ceq $current) { break }
      $current = $parent
    }
  }
  function Assert-Private([string]$Path, [bool]$RequireProtected) {
    Assert-NoReparse $Path
    $acl = Get-Acl -LiteralPath $Path
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $trusted) { throw 'owner' }
    if ($RequireProtected -and -not $acl.AreAccessRulesProtected) { throw 'inheritance' }
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
      if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $trusted) { throw 'access' }
    }
  }
  if (-not [IO.Directory]::Exists($root)) { throw 'root' }
  Assert-Private $root $true
  $ancestor = [IO.Path]::GetDirectoryName($root)
  $unsafeRights = [int][Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [int][Security.AccessControl.FileSystemRights]::ChangePermissions -bor [int][Security.AccessControl.FileSystemRights]::TakeOwnership
  while ($ancestor) {
    $ancestorAcl = Get-Acl -LiteralPath $ancestor
    foreach ($rule in $ancestorAcl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
      if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $trusted -and ($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and (([int]$rule.FileSystemRights -band $unsafeRights) -ne 0)) { throw 'ancestor_access' }
    }
    $ancestor = [IO.Path]::GetDirectoryName($ancestor)
  }
  if ($request.operation -ceq 'create') {
    if (Test-Path -LiteralPath $destination) { throw 'exists' }
    # The parent is already private; no permissive interval is introduced.
    $null = [IO.Directory]::CreateDirectory($destination)
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetOwner($owner)
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($sid in $trusted) {
      $identity = New-Object Security.Principal.SecurityIdentifier($sid)
      $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
      $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $destination -AclObject $acl
  }
  Assert-Private $destination $true
  $pending = New-Object 'Collections.Generic.Stack[string]'
  $pending.Push($destination)
  while ($pending.Count -gt 0) {
    foreach ($item in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
      Assert-Private $item.FullName $false
      if ($item.PSIsContainer) { $pending.Push($item.FullName) }
    }
  }
  [Console]::Out.Write('{"ok":true,"private":true}')
} catch {
  [Console]::Out.Write('{"ok":false,"private":false}')
  exit 1
}
