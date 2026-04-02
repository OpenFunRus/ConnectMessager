using System.Text.Json.Serialization;

namespace ConnectMessager.Desktop.Interop;

public sealed class DesktopBridgeEnvelope
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("payload")]
    public object? Payload { get; set; }
}

public sealed class NativeNotificationRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = "ConnectMessager";

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("chatId")]
    public string? ChatId { get; set; }

    [JsonPropertyName("unreadCount")]
    public int? UnreadCount { get; set; }

    [JsonPropertyName("silent")]
    public bool Silent { get; set; }
}

public sealed class ExternalOpenRequest
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

public sealed class WindowTitleRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
}

public sealed class BadgeCountRequest
{
    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public sealed class DesktopInfoPayload
{
    [JsonPropertyName("appName")]
    public string AppName { get; init; } = "ConnectMessager";

    [JsonPropertyName("version")]
    public string Version { get; init; } = "0.0.0";

    [JsonPropertyName("platform")]
    public string Platform { get; init; } = "windows";

    [JsonPropertyName("environment")]
    public string Environment { get; init; } = "test";

    [JsonPropertyName("startUrl")]
    public string StartUrl { get; init; } = string.Empty;

    [JsonPropertyName("capabilities")]
    public string[] Capabilities { get; init; } = [];
}
