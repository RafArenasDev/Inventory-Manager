' Lanza el watchdog de Reverb (reverb-watchdog.ps1) con ventana totalmente
' oculta (estilo 0) usando WScript.Shell en vez de invocar powershell.exe
' directamente. powershell.exe -WindowStyle Hidden a veces igual asigna una
' consola visible a través de Windows Terminal (el host de consola por
' defecto en Windows 11) — como wscript.exe es un ejecutable de subsistema
' GUI, nunca reserva consola y Windows Terminal nunca se involucra, así que
' no queda ninguna ventana que alguien pueda cerrar por accidente.
Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\reverb-watchdog.ps1"
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & psScript & """", 0, False
