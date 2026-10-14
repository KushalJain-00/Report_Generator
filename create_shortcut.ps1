<#
.SYNOPSIS
Creates Windows Desktop and Start Menu shortcuts for RIG.
#>
param(
    [string]$TargetDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $TargetDir = (Get-Location).Path
}

$batPath = Join-Path $TargetDir "RIG.bat"
$iconPath = Join-Path $TargetDir "assets\icon.ico"

if (-not (Test-Path $batPath)) {
    Write-Warning "RIG.bat not found in $TargetDir"
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
if ($desktopPath) {
    $desktopShortcutPath = Join-Path $desktopPath "RIG.lnk"
    $shortcut = $WshShell.CreateShortcut($desktopShortcutPath)
    $shortcut.TargetPath = $batPath
    $shortcut.WorkingDirectory = $TargetDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }
    $shortcut.Description = "RIG — Report Intelligence Generator"
    $shortcut.Save()
    Write-Host "Created Desktop shortcut: $desktopShortcutPath"
}

# 2. Start Menu Programs Shortcut
$programsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
if ($programsPath) {
    $startShortcutPath = Join-Path $programsPath "RIG.lnk"
    $shortcut = $WshShell.CreateShortcut($startShortcutPath)
    $shortcut.TargetPath = $batPath
    $shortcut.WorkingDirectory = $TargetDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }
    $shortcut.Description = "RIG — Report Intelligence Generator"
    $shortcut.Save()
    Write-Host "Created Start Menu shortcut: $startShortcutPath"
}
