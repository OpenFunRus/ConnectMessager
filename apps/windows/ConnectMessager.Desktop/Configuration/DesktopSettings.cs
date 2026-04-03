namespace ConnectMessager.Desktop.Configuration;

public sealed record DesktopSettings
{
    public string AppName { get; init; } = "ConnectMessager (Мессенджер Коннект)";

    public string EnvironmentName { get; init; } = "production";

    public string StartUrl { get; init; } = "https://connectmessager.ru:40500/";

    public string UserDataFolder { get; init; } = "data\\webview";

    public bool EnableDevTools { get; init; }

    public bool EnableDefaultContextMenus { get; init; } = true;

    public string[] TrustedOrigins { get; init; } = ["https://connectmessager.ru:40500"];
}
