param(
  [switch]$SkipWorker
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $Root 'backend'
$FrontendPath = Join-Path $Root 'frontend'

function Write-Step {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message"
}

function Stop-ProcessesOnPort {
  param(
    [Parameter(Mandatory = $true)]
    [int[]]$Ports
  )

  foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $connections) {
      continue
    }

    $connections |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object {
        Write-Step "Matando processo na porta $port (PID $_)"
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
      }
  }
}

function Stop-WorkerProcess {
  $workerProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'transcode\.worker\.ts' }

  foreach ($process in $workerProcesses) {
    Write-Step "Matando worker antigo (PID $($process.ProcessId))"
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Start-ServiceProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string[]]$NpmArgs
  )

  $argumentText = $NpmArgs -join ' '
  $cmdLine = "cd /d `"$WorkingDirectory`" && npm $argumentText"
  $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $cmdLine) -WorkingDirectory $WorkingDirectory -NoNewWindow -PassThru
  Write-Step "$Name iniciado (PID $($process.Id))"
  return $process
}

function Test-PortReady {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $test = Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
    if ($test.TcpTestSucceeded) {
      Write-Step "$Name respondendo na porta $Port"
      return $true
    }
    Start-Sleep -Seconds 1
  }

  Write-Step "$Name ainda nao respondeu na porta $Port depois de $TimeoutSeconds segundos"
  return $false
}

Write-Step 'Encerrando servicos antigos...'
Stop-ProcessesOnPort -Ports @(4002, 4003)
Stop-WorkerProcess
Start-Sleep -Seconds 2

Write-Step 'Subindo backend...'
$backendProcess = Start-ServiceProcess -Name 'Backend' -WorkingDirectory $BackendPath -NpmArgs @('run', 'start:dev')

Write-Step 'Subindo frontend...'
$frontendProcess = Start-ServiceProcess -Name 'Frontend' -WorkingDirectory $FrontendPath -NpmArgs @('run', 'dev')

if (-not $SkipWorker) {
  Write-Step 'Subindo worker...'
  $workerProcess = Start-ServiceProcess -Name 'Worker' -WorkingDirectory $BackendPath -NpmArgs @('run', 'start:worker')
}

Write-Step 'Aguardando os servicos abrirem as portas...'
Test-PortReady -Port 4003 -Name 'Backend' | Out-Null
Test-PortReady -Port 4002 -Name 'Frontend' | Out-Null

if ($workerProcess) {
  Write-Step "Worker em execucao (PID $($workerProcess.Id))"
}

Write-Step 'Os processos ficaram em execucao. O terminal vai continuar exibindo as saidas enquanto os servicos rodarem.'
Write-Step 'Pressione Ctrl+C para encerrar os servicos e fechar o terminal.'