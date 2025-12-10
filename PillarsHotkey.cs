using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Diagnostics;
using System.Text;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Net;
using System.IO;

class PillarsHotkey : Form
{
    [DllImport("user32.dll")]
    static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
    
    [DllImport("user32.dll")]
    static extern bool UnregisterHotKey(IntPtr hWnd, int id);
    
    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    static extern int GetWindowTextLength(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool IsWindow(IntPtr hWnd);
    
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    const int WM_HOTKEY = 0x0312;
    const uint MOD_ALT = 0x0001;
    const uint MOD_CONTROL = 0x0002;
    const uint VK_P = 0x50;
    const int HOTKEY_ID = 1;
    
    const int SW_HIDE = 0;
    const int SW_SHOW = 5;
    
    static List<IntPtr> pillarsWindows = new List<IntPtr>();
    static List<IntPtr> splashWindows = new List<IntPtr>();
    
    // Watcher per rilevare chiusura finestra
    System.Windows.Forms.Timer watcherTimer;
    bool pillarsWasOpen = false;
    bool isStarting = false; // Flag per evitare avvii multipli
    
    static bool EnumWindowCallback(IntPtr hWnd, IntPtr lParam)
    {
        int length = GetWindowTextLength(hWnd);
        if (length > 0)
        {
            StringBuilder sb = new StringBuilder(length + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (title == "Pillars")
            {
                pillarsWindows.Add(hWnd);
            }
            else if (title.Contains("Pillars OS") || title.Contains("Loading"))
            {
                splashWindows.Add(hWnd);
            }
        }
        return true;
    }
    
    void Toggle()
    {
        pillarsWindows.Clear();
        splashWindows.Clear();
        EnumWindows(EnumWindowCallback, IntPtr.Zero);
        
        // Se c'è già una splash aperta, non fare nulla (sta già avviando)
        if (splashWindows.Count > 0)
        {
            // Porta in primo piano la splash esistente
            SetForegroundWindow(splashWindows[0]);
            return;
        }
        
        if (pillarsWindows.Count == 0)
        {
            // Evita avvii multipli
            if (isStarting) return;
            isStarting = true;
            
            // Calcola posizione e dimensioni finestra
            int screenW = Screen.PrimaryScreen.WorkingArea.Width;
            int screenH = Screen.PrimaryScreen.WorkingArea.Height;
            int winW = 1500;
            int winH = 800;
            int posX = (screenW - winW) / 2;
            int posY = (screenH - winH) / 2;
            
            // Controlla se il server è già pronto
            bool serverReady = IsServerReady();
            
            string url;
            if (serverReady)
            {
                // Server già pronto, vai diretto all'app
                url = "http://localhost:5173";
                isStarting = false;
            }
            else
            {
                // Server non pronto: avvialo e mostra splash
                StartViteServer();
                
                string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                string splashPath = Path.Combine(Path.GetDirectoryName(exePath), "splash.html");
                url = "file:///" + splashPath.Replace("\\", "/");
                
                // Reset flag dopo un po' (la splash si occuperà del redirect)
                System.Windows.Forms.Timer resetTimer = new System.Windows.Forms.Timer();
                resetTimer.Interval = 5000;
                resetTimer.Tick += (s, e) => { isStarting = false; resetTimer.Stop(); resetTimer.Dispose(); };
                resetTimer.Start();
            }
            
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "msedge",
                Arguments = string.Format("--app={0} --window-size={1},{2} --window-position={3},{4}", url, winW, winH, posX, posY),
                UseShellExecute = true
            };
            Process.Start(psi);
            return;
        }
        
        // Toggle visibilità
        bool anyVisible = false;
        foreach (IntPtr hwnd in pillarsWindows)
        {
            if (IsWindowVisible(hwnd))
            {
                anyVisible = true;
                break;
            }
        }
        
        foreach (IntPtr hwnd in pillarsWindows)
        {
            if (anyVisible)
            {
                ShowWindow(hwnd, SW_HIDE);
            }
            else
            {
                ShowWindow(hwnd, SW_SHOW);
                SetForegroundWindow(hwnd);
            }
        }
    }
    
    void StartViteServer()
    {
        try
        {
            string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            string pillarsDir = Path.GetDirectoryName(exePath);
            
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npm run dev",
                WorkingDirectory = pillarsDir,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            Process.Start(psi);
        }
        catch { }
    }
    
    bool IsServerReady()
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://localhost:5173");
            request.Timeout = 500; // 500ms timeout
            request.Method = "HEAD";
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                return response.StatusCode == HttpStatusCode.OK;
            }
        }
        catch
        {
            return false;
        }
    }
    
    public PillarsHotkey()
    {
        this.ShowInTaskbar = false;
        this.WindowState = FormWindowState.Minimized;
        this.FormBorderStyle = FormBorderStyle.None;
        this.Opacity = 0;
        
        if (!RegisterHotKey(this.Handle, HOTKEY_ID, MOD_CONTROL | MOD_ALT, VK_P))
        {
            MessageBox.Show("Impossibile registrare Ctrl+Alt+P");
            Application.Exit();
        }
        
        // Avvia il watcher che controlla se Pillars viene chiuso
        watcherTimer = new System.Windows.Forms.Timer();
        watcherTimer.Interval = 1000; // Controlla ogni secondo
        watcherTimer.Tick += WatcherTick;
        watcherTimer.Start();
    }
    
    void WatcherTick(object sender, EventArgs e)
    {
        // Controlla se esistono finestre Pillars o Splash
        pillarsWindows.Clear();
        splashWindows.Clear();
        EnumWindows(EnumWindowCallback, IntPtr.Zero);
        
        bool pillarsIsOpen = pillarsWindows.Count > 0 || splashWindows.Count > 0;
        
        // Se Pillars ERA aperto e ora NON lo è più = l'utente ha chiuso la finestra
        if (pillarsWasOpen && !pillarsIsOpen)
        {
            // Cleanup: termina il server Vite
            KillViteServer();
            isStarting = false;
        }
        
        pillarsWasOpen = pillarsIsOpen;
    }
    
    void KillViteServer()
    {
        try
        {
            // Trova e termina i processi node che eseguono vite sulla porta 5173
            foreach (Process proc in Process.GetProcessesByName("node"))
            {
                try
                {
                    string cmdLine = GetCommandLine(proc);
                    if (cmdLine != null && (cmdLine.Contains("vite") || cmdLine.Contains("5173")))
                    {
                        proc.Kill();
                    }
                }
                catch { }
            }
        }
        catch { }
    }
    
    string GetCommandLine(Process process)
    {
        try
        {
            using (var searcher = new System.Management.ManagementObjectSearcher(
                "SELECT CommandLine FROM Win32_Process WHERE ProcessId = " + process.Id))
            {
                foreach (var obj in searcher.Get())
                {
                    object cmdLine = obj["CommandLine"];
                    if (cmdLine != null) return cmdLine.ToString();
                }
            }
        }
        catch { }
        return null;
    }
    
    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_HOTKEY && m.WParam.ToInt32() == HOTKEY_ID)
        {
            Toggle();
        }
        base.WndProc(ref m);
    }
    
    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (watcherTimer != null)
        {
            watcherTimer.Stop();
            watcherTimer.Dispose();
        }
        UnregisterHotKey(this.Handle, HOTKEY_ID);
        base.OnFormClosing(e);
    }
    
    [STAThread]
    static void Main()
    {
        bool createdNew;
        using (var mutex = new Mutex(true, "PillarsHotkeyDaemon", out createdNew))
        {
            if (!createdNew) return;
            Application.EnableVisualStyles();
            Application.Run(new PillarsHotkey());
        }
    }
}
