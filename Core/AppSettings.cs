using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WishWinUI.Core;

/// <summary>本机设置：名单、倒计时目标、窗口位置、一言/网络时间开关、自定义数据目录。</summary>
public sealed class AppSettings
{
    /// <summary>名单分组列表。只有一个分组时也在这存。</summary>
    public List<RosterGroup> RosterGroups { get; set; } = [];

    /// <summary>当前使用的分组 ID。</summary>
    public string ActiveGroupId { get; set; } = "";

    /// <summary>旧版单一名单。只在读取旧配置时用于迁移到 RosterGroups。</summary>
    public List<string> CustomNames { get; set; } = [];
    /// <summary>
    /// 当前选中的倒计时目标 ID。为空表示跟随春节自动计算。
    /// </summary>
    public string ActiveTargetId { get; set; } = string.Empty;

    /// <summary>用户自定义保存的倒计时目标（可以有多个）。</summary>
    public List<CountdownTarget> Targets { get; set; } = [];

    /// <summary>一言：是否允许联网获取语录。</summary>
    public bool QuoteEnabled { get; set; } = true;

    /// <summary>网络时间：是否允许联网校准北京时间。</summary>
    public bool TimeSyncEnabled { get; set; } = true;

    /// <summary>主题：0=跟随系统 1=深色 2=浅色。</summary>
    public int ThemeMode { get; set; } = 0;

    public double WindowWidth { get; set; } = 1280;
    public double WindowHeight { get; set; } = 860;
    /// <summary>窗口左边位置。null 表示还没保存过（首次启动）。</summary>
    public double? WindowLeft { get; set; }
    /// <summary>窗口上边位置。null 表示还没保存过（首次启动）。</summary>
    public double? WindowTop { get; set; }
    public bool WindowMaximized { get; set; }

    /// <summary>自定义数据目录。为空表示用默认位置。</summary>
    public string CustomDataDirectory { get; set; } = "";

    /// <summary>当前使用的名单分组（永远不为 null）。</summary>
    public RosterGroup? ActiveGroup =>
        RosterGroups.FirstOrDefault(g => g.Id == ActiveGroupId) ?? RosterGroups.FirstOrDefault();

    /// <summary>当前分组的名字列表。</summary>
    public List<string> ActiveNames => ActiveGroup?.Names ?? [];

    /// <summary>没有自定义目标时，自动用离今天最近、且还没过的那个春节。</summary>
    public static DateTime DefaultTargetDate => SpringFestival.Upcoming(DateTime.Now);

    /// <summary>自动算出来的春节目标（带名字，比如「2027 丁未年春节」）。</summary>
    public static CountdownTarget SpringTarget => CountdownTarget.ForSpring(SpringFestival.Upcoming(DateTime.Now));

    /// <summary>当前生效的目标：选了自定义就用自定义，否则用春节。</summary>
    public CountdownTarget CurrentTarget
    {
        get
        {
            var found = Targets.FirstOrDefault(t => t.Id == ActiveTargetId);
            return found ?? SpringTarget;
        }
    }

    /// <summary>默认数据目录：%AppData%\WishLamp\WishCountdown</summary>
    public static string DefaultDataDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WishLamp", "WishCountdown");

    /// <summary>
    /// 实际使用的数据目录。
    /// 用户在关于页改过位置就用自定义目录，否则用默认目录。
    /// </summary>
    public static string SettingsDirectory
    {
        get
        {
            var custom = Current?.CustomDataDirectory;
            return string.IsNullOrWhiteSpace(custom) ? DefaultDataDirectory : custom;
        }
    }

    /// <summary>当前生效的设置对象（供静态属性读取自定义路径）。</summary>
    private static AppSettings? Current => (App.Current as App)?.Settings;

    [JsonIgnore] public string SettingsPath => Path.Combine(SettingsDirectory, "settings.json");
    [JsonIgnore] public string HistoryPath => Path.Combine(SettingsDirectory, "history.json");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static AppSettings Load()
    {
        var settings = new AppSettings();
        try
        {
            var path = settings.SettingsPath;
            if (File.Exists(path))
            {
                var loaded = JsonSerializer.Deserialize(File.ReadAllText(path), JsonContext.Default.AppSettings);
                if (loaded != null) settings = loaded;
            }
        }
        catch
        {
            // 配置文件坏了就用默认值，不让程序起不来
        }
        settings.Targets ??= [];
        // 清掉坏数据
        settings.Targets = settings.Targets
            .Where(t => t != null && t.Id.Length > 0)
            .ToList();

        // ============ 名单分组：数据整理 + 旧数据迁移 ============
        settings.RosterGroups ??= [];
        settings.RosterGroups = settings.RosterGroups
            .Where(g => g != null)
            .Select(g =>
            {
                g.Names = (g.Names ?? [])
                    .Select(n => (n ?? string.Empty).Trim())
                    .Where(n => n.Length > 0)
                    .Distinct()
                    .ToList();
                if (string.IsNullOrEmpty(g.Id)) g.Id = Guid.NewGuid().ToString("N");
                if (string.IsNullOrWhiteSpace(g.Name)) g.Name = "名单";
                return g;
            })
            .ToList();

        // 旧版单一名单 → 迁移成一个分组
        if (settings.RosterGroups.Count == 0 && settings.CustomNames?.Count > 0)
        {
            settings.RosterGroups.Add(RosterGroup.Create("默认名单", settings.CustomNames));
        }

        // 一个分组都没有时建一个空的，界面才有东西可选
        if (settings.RosterGroups.Count == 0)
        {
            settings.RosterGroups.Add(RosterGroup.Create("默认名单", []));
        }

        // 当前分组 ID 无效就选第一个
        if (settings.RosterGroups.All(g => g.Id != settings.ActiveGroupId))
        {
            settings.ActiveGroupId = settings.RosterGroups[0].Id;
        }

        return settings;
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(SettingsDirectory);
            var json = JsonSerializer.Serialize(this, JsonContext.Default.AppSettings);
            File.WriteAllText(SettingsPath, json);
        }
        catch (Exception ex)
        {
            // 记录失败原因（写到 %AppData%\WishLamp-save-error.log），不再静默吞掉
            try
            {
                var logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "WishLamp-save-error.log");
                File.AppendAllText(logPath,
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} Save 失败{Environment.NewLine}" +
                    $"  路径: {SettingsPath}{Environment.NewLine}" +
                    $"  异常: {ex.GetType().Name}: {ex.Message}{Environment.NewLine}" +
                    $"  详情: {ex}{Environment.NewLine}");
            }
            catch { }
        }
    }
}

/// <summary>一个具名名单分组（比如「1班」「2班」）。</summary>
public sealed class RosterGroup
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public List<string> Names { get; set; } = [];

    public static RosterGroup Create(string name, List<string> names) => new()
    {
        Id = Guid.NewGuid().ToString("N"),
        Name = name,
        Names = names,
    };
}
