param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
# The compiled host embeds and verifies its reviewed root. This wrapper accepts
# no directory, target, operation, URL, source, credential, or callback.
try {
  if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'runtime'}
  $host=[IO.Path]::Combine($PSScriptRoot,'production-isolation.exe')
  if(-not (Test-Path -LiteralPath $host -PathType Leaf)){throw 'installation'}
  & $host
  if($LASTEXITCODE -ne 0){throw 'host'}
} catch {
  [ordered]@{started=$false;operation='temporary-production-isolation';detailsSuppressed=$true}|ConvertTo-Json -Compress
  exit 1
}
