using System.IO;
using System.Text.Json;

namespace ConnectMessager.Desktop.Configuration;

public static class DesktopSettingsLoader
{
    public static DesktopSettings Load(string baseDirectory, IReadOnlyList<string> args)
    {
        var settingsPath = Path.Combine(baseDirectory, "desktopsettings.json");
        DesktopSettings settings;

        if (File.Exists(settingsPath))
        {
            var json = File.ReadAllText(settingsPath);
            settings = JsonSerializer.Deserialize<DesktopSettings>(json, CreateJsonOptions()) ?? new DesktopSettings();
        }
        else
        {
            settings = new DesktopSettings();
        }

        var overrides = ParseOverrides(args);

        return settings with
        {
            StartUrl = overrides.TryGetValue("url", out var url) ? url : settings.StartUrl,
            EnvironmentName = overrides.TryGetValue("env", out var env) ? env : settings.EnvironmentName,
            EnableDevTools = overrides.ContainsKey("devtools") || settings.EnableDevTools,
            UserDataFolder = overrides.TryGetValue("profile", out var profile) ? profile : settings.UserDataFolder
        };
    }

    private static Dictionary<string, string> ParseOverrides(IReadOnlyList<string> args)
    {
        var overrides = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var arg in args)
        {
            if (!arg.StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            var separatorIndex = arg.IndexOf('=');
            if (separatorIndex < 0)
            {
                overrides[arg[2..]] = "true";
                continue;
            }

            var key = arg[2..separatorIndex];
            var value = arg[(separatorIndex + 1)..];
            overrides[key] = value;
        }

        return overrides;
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true
        };
    }
}
