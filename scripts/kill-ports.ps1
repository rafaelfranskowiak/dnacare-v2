param(
  [switch]$Backend,
  [switch]$Frontend,
  [switch]$Both
)

$ports = @()
if ($Backend -or $Both -or (!$Backend -and !$Frontend -and !$Both)) { $ports += 4003 }
if ($Frontend -or $Both) { $ports += 4002 }

foreach ($port in $ports) {
  $pids = netstat -ano | Select-String ":$port" | Select-String "LISTENING" | ForEach-Object {
    $_ -replace '.*\s+(\d+)$', '$1'
  } | Select-Object -Unique

  foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Output "Killed PID $pid (port $port)"
  }

  $still = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
  if (-not $still) { Write-Output "Port $port is FREE" }
}
