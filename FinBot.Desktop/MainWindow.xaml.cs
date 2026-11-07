using System.IO;
using System.Text.Json;
using System.Windows;
using FinBot.Infrastructure;
using Microsoft.Web.WebView2.Core;

namespace FinBot.Desktop;
public partial class MainWindow : Window
{
    private readonly LocalDatabase database = new(LocalDatabase.DefaultPath);
    public MainWindow()
    {
        InitializeComponent();
        Loaded += Initialize;
        Closed += (_, _) => Browser.Dispose();
    }

    private async void Initialize(object sender, RoutedEventArgs e)
    {
        try
        {
            var assets = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            if (!File.Exists(Path.Combine(assets, "index.html")))
                throw new InvalidOperationException("A interface não foi compilada. Execute scripts/publish.ps1.");
            database.Initialize();
            var cache = Path.Combine(Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData), "FinBot", "webview");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: cache);
            await Browser.EnsureCoreWebView2Async(environment);
            var web = Browser.CoreWebView2;
            web.Settings.AreDevToolsEnabled = false;
            web.Settings.AreDefaultContextMenusEnabled = false;
            web.Settings.IsStatusBarEnabled = false;
            web.SetVirtualHostNameToFolderMapping("finbot.local", assets,
                CoreWebView2HostResourceAccessKind.DenyCors);
            web.NavigationStarting += (_, args) => {
                if (!IsLocal(args.Uri)) args.Cancel = true;
            };
            web.FrameNavigationStarting += (_, args) => { if (!IsLocal(args.Uri)) args.Cancel = true; };
            web.DownloadStarting += (_, args) => args.Cancel = true;
            web.NewWindowRequested += (_, args) => args.Handled = true;
            web.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
            var bridge = new FinanceBridge(new FinanceService(database, Environment.GetEnvironmentVariable("FINBOT_RECEIPTS_DIRECTORY") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),"FinBot","Comprovantes")), path => System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(path) { UseShellExecute = true }));
            web.WebMessageReceived += (_, args) => {
                if (IsLocal(args.Source)) web.PostWebMessageAsJson(bridge.Handle(args.WebMessageAsJson));
            };
            web.Navigate("https://finbot.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show("Não foi possível abrir o FinBot.\n\n" + ex.Message +
                "\n\nVerifique se o Microsoft Edge WebView2 Runtime está instalado.",
                "FinBot", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }

    private static bool IsLocal(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == "https" && uri.Host == "finbot.local" && uri.IsDefaultPort;
}
