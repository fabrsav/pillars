# capture_and_hide.ps1 - Trova finestre "Pillars" esistenti, le nasconde e salva gli handle

Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinCapture {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    public const int SW_HIDE = 0;
    
    public static List<IntPtr> foundHandles = new List<IntPtr>();
    
    public static bool EnumCallback(IntPtr hWnd, IntPtr lParam) {
        int len = GetWindowTextLength(hWnd);
        if (len > 0) {
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (title == "Pillars") {
                foundHandles.Add(hWnd);
            }
        }
        return true;
    }
    
    public static void FindAll() {
        foundHandles.Clear();
        EnumWindows(EnumCallback, IntPtr.Zero);
    }
    
    public static void HideAll() {
        foreach (IntPtr h in foundHandles) {
            ShowWindow(h, SW_HIDE);
        }
    }
}
'@

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Trova tutte le finestre Pillars
[WinCapture]::FindAll()
$handles = [WinCapture]::foundHandles

Write-Output "Found $($handles.Count) Pillars window(s)"

if ($handles.Count -gt 0) {
    # Nascondi tutte
    [WinCapture]::HideAll()
    Write-Output "Hidden all Pillars windows"
    
    # Salva gli handle
    $arr = @()
    foreach ($h in $handles) {
        $arr += @{ handle = $h.ToInt64(); title = "Pillars" }
        Write-Output "  Handle: $($h.ToInt64())"
    }
    
    $obj = @{ handles = $arr }
    $handlesFile = Join-Path $scriptPath "pillars_handles.json"
    $obj | ConvertTo-Json | Set-Content $handlesFile -Force
    Write-Output "Saved handles to $handlesFile"
} else {
    Write-Output "No Pillars windows found to hide"
}
