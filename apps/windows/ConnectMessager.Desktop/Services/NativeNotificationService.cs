using System.Drawing;
using System.IO;
using Forms = System.Windows.Forms;

namespace ConnectMessager.Desktop.Services;

public sealed class NativeNotificationService : IDisposable
{
    private readonly string _appName;
    private readonly Forms.NotifyIcon _notifyIcon;

    public NativeNotificationService(string appName, Action openAction, Action reloadAction, Action exitAction)
    {
        _appName = appName;
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
        _notifyIcon.BalloonTipTitle = string.IsNullOrWhiteSpace(title) ? _appName : title;
        _notifyIcon.BalloonTipText = string.IsNullOrWhiteSpace(message) ? "Новое событие в ConnectMessager" : message;
        _notifyIcon.ShowBalloonTip(5000);
    }

    public void UpdateUnreadCount(int count)
    {
        var suffix = count > 0 ? $" | Непрочитано: {count}" : string.Empty;
        var tooltip = $"{_appName}{suffix}";
        _notifyIcon.Text = tooltip.Length > 63 ? tooltip[..63] : tooltip;
    }

    public void Dispose()
    {
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
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

    private static Icon ResolveApplicationIcon()
    {
        try
        {
            var processPath = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(processPath) && File.Exists(processPath))
            {
                var extractedIcon = Icon.ExtractAssociatedIcon(processPath);
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

        return SystemIcons.Application;
    }
}
