param(
    [Parameter(Mandatory)][string]$Installer,
    [switch]$RequireAppList,
    [string]$DesktopName
)
$ErrorActionPreference = 'Stop'
$taskInstaller = (Resolve-Path -LiteralPath $Installer).Path
$taskApp = Join-Path $env:LOCALAPPDATA 'Ixos\Ixos.exe'
$taskLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'Ixos.lnk'
$taskDesktopLink = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Ixos.lnk'
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
    [DllImport("user32.dll", EntryPoint = "IsWindowVisible")] private static extern bool NativeVisible(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint = "IsIconic")] private static extern bool NativeIconic(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint = "ShowWindow")] private static extern bool NativeShow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] private static extern bool SetThreadDesktop(IntPtr desktop);
    [DllImport("user32.dll")] private static extern IntPtr GetThreadDesktop(uint thread);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    private static T OnDesktop<T>(Func<T> action) {
        if (String.IsNullOrEmpty(DesktopName)) { return action(); }
        T result = default(T); Exception failure = null;
        // Window handles are scoped to a desktop. Query them on a fresh thread
        // attached to the test desktop; the visible desktop never switches.
        var thread = new System.Threading.Thread(() => {
            var previous = GetThreadDesktop(GetCurrentThreadId());
            var desktop = OpenDesktop(DesktopName, 0, false, 0x10000000);
            try {
                if (desktop == IntPtr.Zero || !SetThreadDesktop(desktop)) { throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); }
                result = action();
            } catch (Exception error) { failure = error; }
            finally { SetThreadDesktop(previous); if (desktop != IntPtr.Zero) { CloseDesktop(desktop); } }
        });
        thread.Start(); thread.Join();
        if (failure != null) { throw failure; }
        return result;
    }
    public static bool IsWindowVisible(IntPtr hwnd) { return OnDesktop(() => NativeVisible(hwnd)); }
    public static bool IsIconic(IntPtr hwnd) { return OnDesktop(() => NativeIconic(hwnd)); }
    public static bool ShowWindow(IntPtr hwnd, int command) { return OnDesktop(() => NativeShow(hwnd, command)); }
    public static IntPtr MainWindow(int processId) { return OnDesktop(() => FindWindow(processId)); }
    private static IntPtr FindWindow(int processId) {
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
    foreach ($taskShortcutPath in @($taskLink, $taskDesktopLink)) {
        if (!(Test-Path -LiteralPath $taskShortcutPath)) { throw "Installer did not create $taskShortcutPath" }
        $taskShortcut = $taskShell.CreateShortcut($taskShortcutPath)
        if ($taskShortcut.TargetPath -ine $taskApp -or $taskShortcut.Arguments) {
            throw 'Shortcuts must open the installed Ixos.exe without --hidden'
        }
        if ($taskShortcut.IconLocation -notlike "$taskApp,*") { throw 'Shortcut icon does not reference the installed app' }
        $taskItem = $taskExplorer.Namespace((Split-Path -Parent $taskShortcutPath)).ParseName('Ixos.lnk')
        if ($taskItem.ExtendedProperty('System.AppUserModel.ID') -ne 'com.ixos.desktop') {
            throw 'Shortcut is missing the stable application ID'
        }
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
Write-Output 'PASS: silent installation creates valid Start menu and desktop shortcuts'
$taskEngine = Join-Path $env:USERPROFILE '.ixos/bin/ixos.exe'
if (!(Test-Path -LiteralPath $taskEngine)) { throw 'Installer did not provision the engine' }
$taskCodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
if ((Get-Content (Join-Path $taskCodexHome 'config.toml') -Raw) -notmatch '\[mcp_servers.ixos\]') { throw 'Codex MCP was not registered' }
# Windows PowerShell treats JSON keys as case-insensitive. Claude can contain
# project paths that differ only by case, so use Python's JSON parser instead.
@'
import json, pathlib, sys
config = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
assert pathlib.Path(config["mcpServers"]["ixos"]["command"]) == pathlib.Path(sys.argv[2]), "Claude MCP was not registered"
'@ | python - (Join-Path $env:USERPROFILE '.claude.json') $taskEngine
if ($LASTEXITCODE -ne 0) { throw 'Claude MCP was not registered' }
foreach ($taskSkill in @((Join-Path $taskCodexHome 'skills/ixos/SKILL.md'), (Join-Path $env:USERPROFILE '.claude/skills/ixos/SKILL.md'))) {
    if (!(Test-Path -LiteralPath $taskSkill)) { throw "Missing installed skill: $taskSkill" }
}
Write-Output 'PASS: bundled engine, Codex/Claude MCP and skills installed automatically'

# Reproduce the updater edge case: no link, then /UPDATE. Restore it even when
# testing an older/broken installer, so a failed test does not remove app access.
$taskBackup = [IO.File]::ReadAllBytes($taskLink)
$taskDesktopBackup = [IO.File]::ReadAllBytes($taskDesktopLink)
Remove-Item -LiteralPath $taskLink
Remove-Item -LiteralPath $taskDesktopLink
try { Install-Desktop @('/S', '/CURRENTUSER', '/UPDATE') }
finally {
    if (!(Test-Path -LiteralPath $taskLink)) { [IO.File]::WriteAllBytes($taskLink, $taskBackup) }
    if (!(Test-Path -LiteralPath $taskDesktopLink)) { [IO.File]::WriteAllBytes($taskDesktopLink, $taskDesktopBackup) }
}
Write-Output 'PASS: update restores missing Start menu and desktop shortcuts'
if ($RequireAppList) {
    Wait-Until { @(Get-StartApps | Where-Object { $_.AppID -eq 'com.ixos.desktop' }).Count -gt 0 } 'Ixos did not appear in the Windows app list' 30
    Write-Output 'PASS: Windows app list contains Ixos'
}

$taskPrevious = @{}
foreach ($taskName in @('IXOS_NO_UPDATE_CHECK','IXOS_ENGINE_PATH','IXOS_HOME','IXOS_SKILL_HOME')) {
    $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName)
}
$taskProcess = $null
$taskTempRoot = Join-Path ([IO.Path]::GetTempPath()) ('ixos-desktop-smoke-' + [guid]::NewGuid())
try {
    $env:IXOS_NO_UPDATE_CHECK = '1'
    # Launch must work even when the engine is unavailable. This keeps the smoke
    # test offline and avoids installing models/skills into the test user's home.
    $env:IXOS_ENGINE_PATH = Join-Path ([IO.Path]::GetTempPath()) 'ixos-smoke-missing-engine.exe'
    $env:IXOS_HOME = Join-Path $taskTempRoot 'home'
    $env:IXOS_SKILL_HOME = Join-Path $taskTempRoot 'skills'
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
    if ((Test-Path -LiteralPath $taskTempRoot) -and [IO.Path]::GetFullPath($taskTempRoot).StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $taskTempRoot) -like 'ixos-desktop-smoke-*') {
        Remove-Item -LiteralPath $taskTempRoot -Recurse -Force
    }
}
