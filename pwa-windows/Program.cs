using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace EmanusIA;

static class Program
{
    private const string BaseUrl = "https://emanus-ia.vercel.app";
    private const string AppTitle = "Emanus IA — O teu professor";
    private const string MutexName = "Global\\EmanusIA_SingleInstanceMutex";

    private static NotifyIcon? _trayIcon;
    private static ContextMenuStrip? _trayMenu;
    private static Mutex? _mutex;
    private static Process? _browserProcess;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int SW_RESTORE = 9;

    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        _mutex = new Mutex(true, MutexName, out bool isNewInstance);
        if (!isNewInstance)
        {
            // Já existe uma instância a correr, abrir janela principal e sair
            LaunchUrl(args.Length > 0 ? args[0] : BaseUrl);
            return;
        }

        SetupTrayIcon();

        // Iniciar aplicação na página inicial (ou URL passado como argumento)
        string initialUrl = args.Length > 0 ? args[0] : BaseUrl;
        LaunchUrl(initialUrl);

        Application.Run();

        _trayIcon?.Dispose();
        _mutex.ReleaseMutex();
    }

    private static void SetupTrayIcon()
    {
        Icon appIcon;
        string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "icon.ico");
        if (File.Exists(iconPath))
        {
            appIcon = new Icon(iconPath);
        }
        else
        {
            appIcon = SystemIcons.Application;
        }

        _trayMenu = new ContextMenuStrip();
        _trayMenu.Items.Add("Abrir Emanus IA", null, (s, e) => LaunchUrl(BaseUrl));
        _trayMenu.Items.Add("Dashboard", null, (s, e) => LaunchUrl($"{BaseUrl}/dashboard"));
        _trayMenu.Items.Add("Emanus Chat", null, (s, e) => LaunchUrl($"{BaseUrl}/dashboard/emanus"));
        _trayMenu.Items.Add("Aulas", null, (s, e) => LaunchUrl($"{BaseUrl}/dashboard/lessons"));
        _trayMenu.Items.Add("Simulados", null, (s, e) => LaunchUrl($"{BaseUrl}/dashboard/exams"));
        _trayMenu.Items.Add("Horário", null, (s, e) => LaunchUrl($"{BaseUrl}/dashboard/schedule"));
        _trayMenu.Items.Add(new ToolStripSeparator());
        _trayMenu.Items.Add("Sair", null, (s, e) =>
        {
            _trayIcon!.Visible = false;
            Application.Exit();
        });

        _trayIcon = new NotifyIcon
        {
            Text = AppTitle,
            Icon = appIcon,
            ContextMenuStrip = _trayMenu,
            Visible = true
        };

        _trayIcon.DoubleClick += (s, e) => LaunchUrl(BaseUrl);
    }

    public static void LaunchUrl(string url)
    {
        try
        {
            string? browserPath = FindChromiumBrowser();
            if (!string.IsNullOrEmpty(browserPath))
            {
                // Iniciar em modo App PWA standalone (sem barra de navegação/abas)
                var startInfo = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = $"--app=\"{url}\" --window-size=1280,800 --start-maximized",
                    UseShellExecute = false
                };

                _browserProcess = Process.Start(startInfo);
            }
            else
            {
                // Fallback para navegador padrão do sistema
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erro ao abrir o Emanus IA: {ex.Message}", "Emanus IA", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static string? FindChromiumBrowser()
    {
        // 1. Procurar Microsoft Edge (nativo do Windows 10/11)
        string[] edgePaths = [
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
        ];

        foreach (var path in edgePaths)
        {
            if (File.Exists(path)) return path;
        }

        // 2. Procurar Google Chrome como fallback
        string[] chromePaths = [
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
        ];

        foreach (var path in chromePaths)
        {
            if (File.Exists(path)) return path;
        }

        // 3. Procurar no registro do Windows (App Paths)
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe");
            var val = key?.GetValue("") as string;
            if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
        }
        catch { }

        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe");
            var val = key?.GetValue("") as string;
            if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
        }
        catch { }

        return null;
    }
}

