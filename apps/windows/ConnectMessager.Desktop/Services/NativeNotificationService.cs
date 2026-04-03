using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using Drawing = System.Drawing;
using Forms = System.Windows.Forms;

namespace ConnectMessager.Desktop.Services;

public sealed class NativeNotificationService : IDisposable
{
    private readonly string _appName;
    private readonly Action _openAction;
    private readonly Forms.NotifyIcon _notifyIcon;
    private Window? _toastWindow;
    private DispatcherTimer? _toastTimer;

    public NativeNotificationService(string appName, Action openAction, Action reloadAction, Action exitAction)
    {
        _appName = appName;
        _openAction = openAction;
        _notifyIcon = new Forms.NotifyIcon
        {
            Visible = true,
            Text = appName.Length > 63 ? appName[..63] : appName,
            Icon = ResolveApplicationIcon(),
            BalloonTipIcon = Forms.ToolTipIcon.Info,
            ContextMenuStrip = BuildMenu(openAction, reloadAction, exitAction)
        };

        _notifyIcon.DoubleClick += (_, _) => openAction();
    }

    public void ShowBalloon(string title, string message)
    {
        var safeTitle = string.IsNullOrWhiteSpace(title) ? _appName : title;
        var safeMessage = string.IsNullOrWhiteSpace(message) ? "Новое событие в ConnectMessager" : message;

        _notifyIcon.BalloonTipTitle = safeTitle;
        _notifyIcon.BalloonTipText = safeMessage;
        _notifyIcon.ShowBalloonTip(5000);
        ShowToastWindow(safeTitle, safeMessage);
    }

    public void UpdateUnreadCount(int count)
    {
        var suffix = count > 0 ? $" | Непрочитано: {count}" : string.Empty;
        var tooltip = $"{_appName}{suffix}";
        _notifyIcon.Text = tooltip.Length > 63 ? tooltip[..63] : tooltip;
    }

    public void Dispose()
    {
        _toastTimer?.Stop();
        _toastTimer = null;

        if (_toastWindow is not null)
        {
            _toastWindow.Close();
            _toastWindow = null;
        }

        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
    }

    private void ShowToastWindow(string title, string message)
    {
        _toastTimer?.Stop();

        if (_toastWindow is not null)
        {
            _toastWindow.Close();
            _toastWindow = null;
        }

        var titleText = new TextBlock
        {
            Text = title,
            Foreground = System.Windows.Media.Brushes.White,
            FontSize = 15,
            FontWeight = FontWeights.SemiBold,
            TextWrapping = TextWrapping.Wrap
        };

        var bodyText = new TextBlock
        {
            Margin = new Thickness(0, 8, 0, 0),
            Text = message,
            Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(214, 225, 236)),
            FontSize = 13,
            TextWrapping = TextWrapping.Wrap,
            MaxHeight = 120
        };

        var toastBody = new Border
        {
            Width = 340,
            Padding = new Thickness(16, 14, 16, 14),
            CornerRadius = new CornerRadius(14),
            Background = new SolidColorBrush(System.Windows.Media.Color.FromArgb(245, 17, 26, 36)),
            BorderBrush = new SolidColorBrush(System.Windows.Media.Color.FromRgb(62, 88, 112)),
            BorderThickness = new Thickness(1),
            Child = new StackPanel
            {
                Children =
                {
                    titleText,
                    bodyText
                }
            }
        };

        var toastWindow = new Window
        {
            Width = 340,
            SizeToContent = SizeToContent.Height,
            ShowInTaskbar = false,
            ShowActivated = false,
            Topmost = true,
            ResizeMode = ResizeMode.NoResize,
            WindowStyle = WindowStyle.None,
            AllowsTransparency = true,
            Background = System.Windows.Media.Brushes.Transparent,
            Content = toastBody
        };

        toastWindow.Loaded += (_, _) =>
        {
            var workArea = SystemParameters.WorkArea;
            toastWindow.Left = workArea.Right - toastWindow.ActualWidth - 16;
            toastWindow.Top = workArea.Bottom - toastWindow.ActualHeight - 16;
        };

        toastWindow.MouseLeftButtonUp += (_, _) =>
        {
            _openAction();
            toastWindow.Close();
        };

        toastWindow.Closed += (_, _) =>
        {
            if (ReferenceEquals(_toastWindow, toastWindow))
            {
                _toastWindow = null;
            }
        };

        _toastWindow = toastWindow;
        toastWindow.Show();

        _toastTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(5)
        };
        _toastTimer.Tick += (_, _) =>
        {
            _toastTimer?.Stop();
            _toastTimer = null;

            if (ReferenceEquals(_toastWindow, toastWindow))
            {
                toastWindow.Close();
            }
        };
        _toastTimer.Start();
    }

    private Forms.ContextMenuStrip BuildMenu(Action openAction, Action reloadAction, Action exitAction)
    {
        var menu = new Forms.ContextMenuStrip();
        menu.Items.Add("Открыть ConnectMessager", null, (_, _) => openAction());
        menu.Items.Add("Перезагрузить окно", null, (_, _) => reloadAction());
        menu.Items.Add("-");
        menu.Items.Add("Выход", null, (_, _) => exitAction());
        return menu;
    }

    private static Drawing.Icon ResolveApplicationIcon()
    {
        try
        {
            var processPath = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(processPath) && File.Exists(processPath))
            {
                var extractedIcon = Drawing.Icon.ExtractAssociatedIcon(processPath);
                if (extractedIcon is not null)
                {
                    return extractedIcon;
                }
            }
        }
        catch
        {
            // Fallback to a default system icon if icon extraction fails.
        }

        return Drawing.SystemIcons.Application;
    }
}
