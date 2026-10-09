param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
try {
  if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
  $root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
  Add-Type -Path (Join-Path $root 'production-isolation.exe')
  . (Join-Path $PSScriptRoot 'production-isolation-prior-state-seal.ps1')
  # Bound allocation before parsing; the owning host contains this process in
  # its job and enforces the total pipe deadline.
  $builder=New-Object Text.StringBuilder
  $byteCount=0
  while($true){
    $next=[Console]::In.Read()
    if($next -lt 0 -or $next -eq 10){break}
    $character=[char]$next
    $byteCount+=[Text.Encoding]::UTF8.GetByteCount([string]$character)
    if($byteCount -gt 65536){throw 'packet'}
    $null=$builder.Append($character)
  }
  $line=$builder.ToString().TrimEnd([char]13)
  if($null -eq $line -or [Text.Encoding]::UTF8.GetByteCount($line) -gt 65536){throw 'packet'}
  $packet=$line|ConvertFrom-Json
  if((@($packet.PSObject.Properties.Name|Sort-Object)-join ',') -cne 'context,priorState'){throw 'packet'}
  $context=[Text.Encoding]::UTF8.GetBytes(($packet.context|ConvertTo-Json -Depth 6 -Compress))
  $prior=[Text.Encoding]::UTF8.GetBytes(($packet.priorState|ConvertTo-Json -Depth 24 -Compress))
  Invoke-ProductionIsolationPriorStateSeal -ContextUtf8 $context -PriorStateUtf8 $prior
} catch {
  [Console]::Error.WriteLine('Production isolation prior state bridge refused.')
  exit 1
}