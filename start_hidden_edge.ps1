# start_hidden_edge.ps1
# Starts Edge in app mode and hides its app window(s) immediately so future toggles are instant.

param(
    [string]$url = "http://localhost:5173",
    [int]$timeoutSeconds = 8
)

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class Win32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    public const int SW_HIDE = 0;
    public const int SW_SHOW = 5;
    public const int SW_RESTORE = 9;
}
"@

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Launch Edge in app mode (capture process)
$proc = Start-Process -FilePath "msedge" -ArgumentList "--new-window --app=$url" -PassThru

# Wait up to timeoutSeconds for windows owned by this process to appear, then hide them
$sw = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
$hiddenAny = $false
while ([DateTime]::UtcNow -lt $sw) {
    $list = @()
    [Win32+EnumWindowsProc]$cb = {
        param($hWnd, $lParam)
        try {
            $len = [Win32]::GetWindowTextLength($hWnd)
            if ($len -gt 0) {
                $sb = New-Object System.Text.StringBuilder ($len + 1)
                [Win32]::GetWindowText($hWnd, $sb, $sb.Capacity) | Out-Null
                $title = $sb.ToString()
                if ($title -and ($title -match 'Pillars')) {
                    $list += @{Handle=$hWnd; Title=$title}
                }
            }
        } catch {}
        return $true
    }
    [Win32]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null

    if ($list.Count -gt 0) {
        foreach ($entry in $list) {
            try {
                [Win32]::ShowWindow($entry.Handle, [Win32]::SW_HIDE) | Out-Null
                $hiddenAny = $true
            } catch {}
        }
        break
    }
    Start-Sleep -Milliseconds 250
}

if ($hiddenAny) {
    Write-Output "Hidden Edge Pillars window(s) for PID $($proc.Id)"
    # Save handles to file for fast toggling
    $handlesPath = Join-Path $scriptPath "pillars_handles.json"
    $arr = $list | ForEach-Object { @{ handle = $_.Handle.ToInt64(); title = $_.Title } }
    $obj = @{ pid = $proc.Id; handles = $arr }
    $obj | ConvertTo-Json | Set-Content $handlesPath -Force
    Write-Output "Saved handles to $handlesPath"
} else {
    Write-Output "Did not find any windows for PID $($proc.Id) within timeout"
}
