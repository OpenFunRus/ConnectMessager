using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Threading;
using ConnectMessager.Desktop.Configuration;
using ConnectMessager.Desktop.Interop;
using ConnectMessager.Desktop.Services;
using Microsoft.Web.WebView2.Core;
using WpfApplication = System.Windows.Application;

namespace ConnectMessager.Desktop;

public partial class MainWindow : Window
{
    private readonly DesktopSettings _settings;
    private readonly NativeNotificationService _notificationService;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);
    private readonly DispatcherTimer _reconnectTimer;
    private bool _browserInitialized;
    private int _unreadCount;
    private int _secondsUntilReconnect;

    public MainWindow(DesktopSettings settings)
    {
        _settings = settings;
        InitializeComponent();

        Title = settings.AppName;

        _notificationService = new NativeNotificationService(
            settings.AppName,
            OpenMainWindow,
            ReloadCurrentPage,
            () => WpfApplication.Current.Shutdown());

        _reconnectTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(1)
        };
        _reconnectTimer.Tick += ReconnectTimer_OnTick;

        Loaded += OnLoaded;
        Closed += OnClosed;
        Activated += (_, _) => ClearAttentionState();
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await InitializeBrowserAsync();
    }

    private void OnClosed(object? sender, EventArgs e)
    {
        _reconnectTimer.Stop();
        _notificationService.Dispose();
    }

    private async Task InitializeBrowserAsync()
    {
        try
        {
            StopReconnectCountdown();
            ShowLoadingOverlay(
                "Запуск ConnectMessager",
                "Подготавливаем WebView2 и загружаем сайт.");

            var userDataFolder = ResolveUserDataFolder();
            Directory.CreateDirectory(userDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
            await Browser.EnsureCoreWebView2Async(environment);

            ConfigureBrowser();

            if (!_browserInitialized)
            {
                await Browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(DesktopBridgeScript.Content);
                Browser.CoreWebView2.WebMessageReceived += CoreWebView2_OnWebMessageReceived;
                Browser.CoreWebView2.NewWindowRequested += CoreWebView2_OnNewWindowRequested;
                Browser.CoreWebView2.NavigationStarting += CoreWebView2_OnNavigationStarting;
                Browser.CoreWebView2.NavigationCompleted += CoreWebView2_OnNavigationCompleted;
                Browser.CoreWebView2.PermissionRequested += CoreWebView2_OnPermissionRequested;
                _browserInitialized = true;
            }

            Browser.Source = new Uri(_settings.StartUrl);
        }
        catch (Exception ex)
        {
            ShowReconnectOverlay(
                "Не удалось запустить desktop-клиент",
                $"Ошибка инициализации WebView2: {ex.Message}\nПроверьте наличие WebView2 Runtime и доступность домена {_settings.StartUrl}.");
        }
    }

    private void ConfigureBrowser()
    {
        var webViewSettings = Browser.CoreWebView2.Settings;
        webViewSettings.AreDefaultContextMenusEnabled = _settings.EnableDefaultContextMenus;
        webViewSettings.AreDevToolsEnabled = _settings.EnableDevTools;
        webViewSettings.IsStatusBarEnabled = false;
        webViewSettings.AreBrowserAcceleratorKeysEnabled = true;
        webViewSettings.IsGeneralAutofillEnabled = false;
        webViewSettings.IsPasswordAutosaveEnabled = true;
    }

    private void CoreWebView2_OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        StopReconnectCountdown();
        ShowLoadingOverlay("Подключение к ConnectMessager", "Загружаем web-клиент.");
    }

    private void CoreWebView2_OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess)
        {
            StopReconnectCountdown();
            Overlay.Visibility = Visibility.Collapsed;
            SendDesktopEvent("desktop.host.info", BuildDesktopInfo());
            return;
        }

        ShowReconnectOverlay(
            "Не удалось загрузить сайт",
            $"Сайт сейчас недоступен.\nКод ошибки: {e.WebErrorStatus}.");
    }

    private void CoreWebView2_OnPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs e)
    {
        if (IsTrustedUri(e.Uri))
        {
            e.State = CoreWebView2PermissionState.Allow;
            return;
        }

        e.State = CoreWebView2PermissionState.Default;
    }

    private void CoreWebView2_OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        OpenExternalUrl(e.Uri);
    }

    private void CoreWebView2_OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<DesktopBridgeEnvelope>(e.WebMessageAsJson, _jsonOptions);
            if (envelope is null)
            {
                return;
            }

            HandleBridgeMessage(envelope);
        }
        catch (JsonException)
        {
            // Ignore invalid payloads from the page to keep the shell resilient.
        }
    }

    private void HandleBridgeMessage(DesktopBridgeEnvelope envelope)
    {
        switch (envelope.Type)
        {
            case "desktop.app.ready":
            case "desktop.info.request":
                SendDesktopEvent("desktop.host.info", BuildDesktopInfo());
                break;

            case "desktop.notification.show":
                var notification = DeserializePayload<NativeNotificationRequest>(envelope.Payload);
                if (notification is null)
                {
                    return;
                }

                if (notification.UnreadCount.HasValue)
                {
                    UpdateUnreadCount(notification.UnreadCount.Value);
                }

                _notificationService.ShowBalloon(notification.Title, notification.Message);
                WindowAttentionService.Flash(this);
                break;

            case "desktop.window.flash":
                WindowAttentionService.Flash(this);
                break;

            case "desktop.window.focus":
                OpenMainWindow();
                break;

            case "desktop.window.set-title":
                var titleRequest = DeserializePayload<WindowTitleRequest>(envelope.Payload);
                if (titleRequest is not null && !string.IsNullOrWhiteSpace(titleRequest.Title))
                {
                    Title = titleRequest.Title;
                }
                break;

            case "desktop.external.open":
                var externalRequest = DeserializePayload<ExternalOpenRequest>(envelope.Payload);
                if (externalRequest is not null)
                {
                    OpenExternalUrl(externalRequest.Url);
                }
                break;

            case "desktop.badge.set":
                var badgeRequest = DeserializePayload<BadgeCountRequest>(envelope.Payload);
                if (badgeRequest is not null)
                {
                    UpdateUnreadCount(badgeRequest.Count);
                }
                break;
        }
    }

    private T? DeserializePayload<T>(object? payload)
    {
        if (payload is null)
        {
            return default;
        }

        if (payload is JsonElement jsonElement)
        {
            return jsonElement.Deserialize<T>(_jsonOptions);
        }

        var json = JsonSerializer.Serialize(payload, _jsonOptions);
        return JsonSerializer.Deserialize<T>(json, _jsonOptions);
    }

    private DesktopInfoPayload BuildDesktopInfo()
    {
        return new DesktopInfoPayload
        {
            AppName = _settings.AppName,
            Version = typeof(MainWindow).Assembly.GetName().Version?.ToString() ?? "1.0.0",
            Platform = "windows",
            Environment = _settings.EnvironmentName,
            StartUrl = _settings.StartUrl,
            Capabilities =
            [
                "webview2",
                "native-notifications",
                "taskbar-flash",
                "tray-icon",
                "external-link-open",
                "single-instance"
            ]
        };
    }

    private void SendDesktopEvent(string type, object payload)
    {
        if (Browser.CoreWebView2 is null)
        {
            return;
        }

        var envelope = new DesktopBridgeEnvelope
        {
            Type = type,
            Payload = payload
        };

        Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(envelope, _jsonOptions));
    }

    private void UpdateUnreadCount(int count)
    {
        _unreadCount = Math.Max(0, count);
        _notificationService.UpdateUnreadCount(_unreadCount);
        Title = _unreadCount > 0
            ? $"({_unreadCount}) {_settings.AppName}"
            : _settings.AppName;
    }

    private void ClearAttentionState()
    {
        if (_unreadCount <= 0)
        {
            Title = _settings.AppName;
        }
    }

    private void OpenExternalUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return;
        }

        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = uri.ToString(),
            UseShellExecute = true
        });
    }

    private bool IsTrustedUri(string? uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out var absoluteUri))
        {
            return false;
        }

        foreach (var trustedOrigin in _settings.TrustedOrigins)
        {
            if (Uri.TryCreate(trustedOrigin, UriKind.Absolute, out var trustedUri) &&
                string.Equals(trustedUri.Host, absoluteUri.Host, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private string ResolveUserDataFolder()
    {
        return Path.IsPathRooted(_settings.UserDataFolder)
            ? _settings.UserDataFolder
            : Path.Combine(AppContext.BaseDirectory, _settings.UserDataFolder);
    }

    private void ShowLoadingOverlay(string title, string body)
    {
        OverlayTitleTextBlock.Text = title;
        OverlayBodyTextBlock.Text = body;
        OverlayCountdownTextBlock.Visibility = Visibility.Collapsed;
        RetryButton.Visibility = Visibility.Collapsed;
        Overlay.Visibility = Visibility.Visible;
    }

    private void ShowReconnectOverlay(string title, string body)
    {
        OverlayTitleTextBlock.Text = title;
        OverlayBodyTextBlock.Text = body;
        RetryButton.Visibility = Visibility.Visible;
        Overlay.Visibility = Visibility.Visible;
        StartReconnectCountdown(60);
    }

    private void StartReconnectCountdown(int seconds)
    {
        _secondsUntilReconnect = seconds;
        UpdateReconnectCountdownText();

        if (!_reconnectTimer.IsEnabled)
        {
            _reconnectTimer.Start();
        }
    }

    private void StopReconnectCountdown()
    {
        _reconnectTimer.Stop();
        OverlayCountdownTextBlock.Visibility = Visibility.Collapsed;
    }

    private void UpdateReconnectCountdownText()
    {
        OverlayCountdownTextBlock.Text = $"Переподключение через {_secondsUntilReconnect} секунд...";
        OverlayCountdownTextBlock.Visibility = Visibility.Visible;
    }

    private async void ReconnectTimer_OnTick(object? sender, EventArgs e)
    {
        if (_secondsUntilReconnect > 1)
        {
            _secondsUntilReconnect--;
            UpdateReconnectCountdownText();
            return;
        }

        _reconnectTimer.Stop();
        await InitializeBrowserAsync();
    }

    private void OpenMainWindow()
    {
        if (WindowState == WindowState.Minimized)
        {
            WindowState = WindowState.Normal;
        }

        Show();
        Activate();
        Topmost = true;
        Topmost = false;
        Focus();
    }

    private void ReloadCurrentPage()
    {
        if (Browser.CoreWebView2 is null)
        {
            _ = InitializeBrowserAsync();
            return;
        }

        StopReconnectCountdown();
        ShowLoadingOverlay("Подключение к ConnectMessager", "Повторно загружаем сайт.");
        Browser.Reload();
    }

    private void RetryButton_OnClick(object sender, RoutedEventArgs e)
    {
        ReloadCurrentPage();
    }
}