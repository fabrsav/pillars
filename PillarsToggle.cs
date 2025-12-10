// PillarsToggle.cs - Compile with: csc /target:winexe /out:PillarsToggle.exe PillarsToggle.cs
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;

class PillarsToggle {
    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    static extern int GetWindowTextLength(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);
    
    const int SW_HIDE = 0;
    const int SW_SHOW = 5;
    const int SW_RESTORE = 9;
    
    static List<IntPtr> pillarsWindows = new List<IntPtr>();
    
    static bool EnumCallback(IntPtr hWnd, IntPtr lParam) {
        int len = GetWindowTextLength(hWnd);
        if (len > 0) {
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            if (sb.ToString() == "Pillars") {
                pillarsWindows.Add(hWnd);
            }
        }
        return true;
    }
    
    static void Main(string[] args) {
        // Trova tutte le finestre Pillars
        pillarsWindows.Clear();
        EnumWindows(EnumCallback, IntPtr.Zero);
        
        if (pillarsWindows.Count > 0) {
            // Controlla se almeno una è visibile
            bool anyVisible = false;
            foreach (IntPtr h in pillarsWindows) {
                if (IsWindowVisible(h)) {
                    anyVisible = true;
                    break;
                }
            }
            
            if (anyVisible) {
                // Nascondi tutte
                foreach (IntPtr h in pillarsWindows) {
                    ShowWindow(h, SW_HIDE);
                }
            } else {
                // Mostra tutte
                foreach (IntPtr h in pillarsWindows) {
                    ShowWindow(h, SW_SHOW);
                    ShowWindow(h, SW_RESTORE);
                }
                if (pillarsWindows.Count > 0) {
                    SetForegroundWindow(pillarsWindows[0]);
                }
            }
        } else {
            // Nessuna finestra trovata - avvia Edge
            Process.Start("msedge", "--app=http://localhost:5173");
        }
    }
}
