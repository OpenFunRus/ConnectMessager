namespace ConnectMessager.Desktop.Configuration;

public sealed record DesktopSettings
{
    public string AppName { get; init; } = "ConnectMessager (Мессенджер Коннект)";

    public string EnvironmentName { get; init; } = "test";

    public string StartUrl { get; init; } = "https://testpobeda.duckdns.org/";

    public string UserDataFolder { get; init; } = "data\\webview";

    public bool EnableDevTools { get; init; }

    public bool EnableDefaultContextMenus { get; init; } = true;

    public string[] TrustedOrigins { get; init; } = [];
}
