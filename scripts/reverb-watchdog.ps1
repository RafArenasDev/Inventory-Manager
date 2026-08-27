# Mantiene "php artisan reverb:start" corriendo en segundo plano.
# Si el proceso se cae (crash, reinicio de Herd, lo que sea), lo vuelve
# a levantar solo. Pensado para registrarse como Tarea Programada de
# Windows que arranca "Al iniciar sesión", así el tiempo real funciona
# sin que nadie tenga que abrir una terminal.

$ProjectPath = Split-Path -Parent $PSScriptRoot
$PhpBat = "$env:USERPROFILE\.config\herd\bin\php.bat"
$LogFile = Join-Path $ProjectPath 'storage\logs\reverb-watchdog.log'

Set-Location $ProjectPath

while ($true) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$timestamp] Iniciando reverb:start..."
    & $PhpBat artisan reverb:start *>> $LogFile
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$timestamp] reverb:start terminó (exit $LASTEXITCODE), reintentando en 3s..."
    Start-Sleep -Seconds 3
}
