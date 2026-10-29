param(
    [Parameter(Mandatory)][string]$Installer,
    [switch]$RequireAppList,
    [string]$DesktopName
)
$ErrorActionPreference = 'Stop'
$taskInstaller = (Resolve-Path -LiteralPath $Installer).Path
$taskApp = Join-Path $env:LOCALAPPDATA 'Ixos\Ixos.exe'
$taskLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'Ixos.lnk'
$taskShell = New-Object -ComObject WScript.Shell
$taskExplorer = New-Object -ComObject Shell.Application

Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class IxosLaunchProbe {
    public static string DesktopName;
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct Startup {
        public int cb; public string reserved, desktop, title;
        public int x, y, width, height, xchars, ychars, fill, flags;
        public short show, reservedLength; public IntPtr reservedBytes, input, output, error;
    }
    [StructLayout(LayoutKind.Sequential)] private struct ProcessInfo { public IntPtr process, thread; public int pid, tid; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool CreateProcess(string app, StringBuilder command, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref Startup startup, out ProcessInfo info);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    public static System.Diagnostics.Process Launch(string app, string arguments, string desktop) {
        var startup = new Startup { cb = Marshal.SizeOf(typeof(Startup)), desktop = "WinSta0\\" + desktop };
        ProcessInfo info;
        if (!CreateProcess(app, new StringBuilder("\"" + app + "\" " + arguments), IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref startup, out info)) {
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        }
        try { return System.Diagnostics.Process.GetProcessById(info.pid); }
        finally { CloseHandle(info.thread); CloseHandle(info.process); }
    }
    private delegate bool Callback(IntPtr hwnd, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(Callback callback, IntPtr data);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] private static extern bool EnumDesktopWindows(IntPtr desktop, Callback callback, IntPtr data);
    [DllImport("user32.dll")] private static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int length);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    public static IntPtr MainWindow(int processId) {
        IntPtr found = IntPtr.Zero;
        Callback inspect = (hwnd, data) => {
            uint pid; GetWindowThreadProcessId(hwnd, out pid);
            var title = new StringBuilder(256); GetWindowText(hwnd, title, title.Capacity);
            if (pid == processId && title.ToString() == "Ixos") { found = hwnd; return false; }
            return true;
        };
        if (String.IsNullOrEmpty(DesktopName)) { EnumWindows(inspect, IntPtr.Zero); }
        else {
            var desktop = OpenDesktop(DesktopName, 0, false, 0x41);
            if (desktop == IntPtr.Zero) { throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); }
            try { EnumDesktopWindows(desktop, inspect, IntPtr.Zero); }
            finally { CloseDesktop(desktop); }
        }
        return found;
    }
}
'@
[IxosLaunchProbe]::DesktopName = $DesktopName

function Wait-Until([scriptblock]$Check, [string]$Failure, [int]$Seconds = 20) {
    $taskDeadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    do {
        if (& $Check) { return }
        Start-Sleep -Milliseconds 200
    } while ([DateTime]::UtcNow -lt $taskDeadline)
    throw $Failure
}
function Assert-Shortcut {
    if (!(Test-Path -LiteralPath $taskApp)) { throw 'Installer did not install Ixos.exe' }
    if (!(Test-Path -LiteralPath $taskLink)) { throw 'Installer did not create the Start menu shortcut' }
    $taskShortcut = $taskShell.CreateShortcut($taskLink)
    if ($taskShortcut.TargetPath -ine $taskApp -or $taskShortcut.Arguments) {
        throw 'Start menu shortcut must open the installed Ixos.exe without --hidden'
    }
    if ($taskShortcut.IconLocation -notlike "$taskApp,*") { throw 'Shortcut icon does not reference the installed app' }
    $taskItem = $taskExplorer.Namespace((Split-Path -Parent $taskLink)).ParseName('Ixos.lnk')
    if ($taskItem.ExtendedProperty('System.AppUserModel.ID') -ne 'com.ixos.desktop') {
        throw 'Start menu shortcut is missing the stable application ID'
    }
}
function Install-Desktop([string[]]$InstallArguments) {
    $taskInstall = Start-Process -FilePath $taskInstaller -ArgumentList $InstallArguments -WindowStyle Hidden -Wait -PassThru
    if ($taskInstall.ExitCode -ne 0) { throw "Desktop installer failed: $($taskInstall.ExitCode)" }
    Assert-Shortcut
}
function Start-Desktop([string]$Arguments = '') {
    if ($DesktopName) { return [IxosLaunchProbe]::Launch($taskApp, $Arguments, $DesktopName) }
    # This is the GUI under test, on the selected desktop. SW_HIDE would override
    # its first ShowWindow call and invalidate the launch visibility assertion.
    if ($Arguments) { return Start-Process -FilePath $taskApp -ArgumentList $Arguments -PassThru }
    return Start-Process -FilePath $taskApp -PassThru
}

# Do not replace a running user's desktop or touch its search configuration.
if (Get-Process -Name 'Ixos','ixos-app' -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $taskApp -or $_.Path -like '*\Ixos\ixos-app.exe' }) {
    throw 'Close the installed Ixos desktop before running the installer smoke test'
}
Install-Desktop @('/S', '/CURRENTUSER')
Write-Output 'PASS: silent installation creates a valid Start menu entry'

# Reproduce the updater edge case: no link, then /UPDATE. Restore it even when
# testing an older/broken installer, so a failed test does not remove app access.
$taskBackup = [IO.File]::ReadAllBytes($taskLink)
Remove-Item -LiteralPath $taskLink
try { Install-Desktop @('/S', '/CURRENTUSER', '/UPDATE') }
finally { if (!(Test-Path -LiteralPath $taskLink)) { [IO.File]::WriteAllBytes($taskLink, $taskBackup) } }
Write-Output 'PASS: update restores a missing Start menu entry'
if ($RequireAppList) {
    Wait-Until { @(Get-StartApps | Where-Object { $_.AppID -eq 'com.ixos.desktop' }).Count -gt 0 } 'Ixos did not appear in the Windows app list' 30
    Write-Output 'PASS: Windows app list contains Ixos'
}

$taskPrevious = @{}
foreach ($taskName in @('IXOS_NO_UPDATE_CHECK','IXOS_ENGINE_PATH')) {
    $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName)
}
$taskProcess = $null
try {
    $env:IXOS_NO_UPDATE_CHECK = '1'
    # Launch must work even when the engine is unavailable. This keeps the smoke
    # test offline and avoids installing models/skills into the test user's home.
    $env:IXOS_ENGINE_PATH = Join-Path ([IO.Path]::GetTempPath()) 'ixos-smoke-missing-engine.exe'
    $taskProcess = Start-Desktop
    Wait-Until { [IxosLaunchProbe]::IsWindowVisible([IxosLaunchProbe]::MainWindow($taskProcess.Id)) } 'Normal launch did not show the main window'
    Stop-Process -Id $taskProcess.Id
    Wait-Until { $taskProcess.HasExited } 'Normal launch did not stop after the test'
    Write-Output 'PASS: normal launch opens the main window'
    $taskProcess = Start-Desktop '--hidden'
    Wait-Until { [IxosLaunchProbe]::MainWindow($taskProcess.Id) -ne [IntPtr]::Zero } 'Hidden launch did not create the main window'
    $taskWindow = [IxosLaunchProbe]::MainWindow($taskProcess.Id)
    if ([IxosLaunchProbe]::IsWindowVisible($taskWindow)) { throw '--hidden must start in the tray' }
    $taskSecond = Start-Desktop
    Wait-Until { [IxosLaunchProbe]::IsWindowVisible([IxosLaunchProbe]::MainWindow($taskProcess.Id)) } 'Opening Ixos again did not show the running window'
    $taskWindow = [IxosLaunchProbe]::MainWindow($taskProcess.Id)
    Wait-Until { $taskSecond.HasExited } 'Second launch did not hand off to the running app'
    [void][IxosLaunchProbe]::ShowWindow($taskWindow, 6)
    $taskThird = Start-Desktop
    Wait-Until { ![IxosLaunchProbe]::IsIconic($taskWindow) } 'Launching Ixos did not restore its minimized window'
    Wait-Until { $taskThird.HasExited } 'Third launch did not hand off to the running app'
    Write-Output 'PASS: hidden startup, repeated launch and minimized-window restore'
} finally {
    if ($taskProcess -and !$taskProcess.HasExited) { Stop-Process -Id $taskProcess.Id }
    foreach ($taskName in $taskPrevious.Keys) { [Environment]::SetEnvironmentVariable($taskName, $taskPrevious[$taskName]) }
}
