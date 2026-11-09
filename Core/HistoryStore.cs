using System.IO;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WishWinUI.Core;

/// <summary>一条历史记录。</summary>
public sealed class HistoryRecord
{
    public string Name { get; set; } = "";
    public int Rarity { get; set; }
    public bool IsUP { get; set; }
    public bool TriggeredCaptureLight { get; set; }
    public string Date { get; set; } = "";
    public string Time { get; set; } = "";

    [JsonIgnore] public string RarityText => Rarity switch { 0 => "五星", 1 => "四星", _ => "三星" };
    [JsonIgnore] public string RarityLabel => Rarity switch
    {
        0 => "五星" + (IsUP ? " UP!" : "") + (TriggeredCaptureLight ? "——捕获明光" : ""),
        1 => "四星" + (IsUP ? " UP!" : ""),
        _ => "三星",
    };
}

/// <summary>一周的抽卡状态：累计次数、两个保底计数、大保底/捕获明光、历史记录。</summary>
public sealed class WeekState
{
    public int TotalDraws { get; set; }
    public int FiveStarPity { get; set; }
    public int FourStarPity { get; set; }
    public bool IsGuaranteed5StarUP { get; set; }
    public bool IsGuaranteed4StarUP { get; set; }
    public bool IsCaptureLightGuaranteed { get; set; }
    public bool LastFiveStarWasNonUp { get; set; }
    public int CaptureLightCounter { get; set; } = 1;
    public List<HistoryRecord> History { get; set; } = [];
}

/// <summary>
/// 按周隔离的持久化数据。键是 ISO 年_周（例如 2027_W6），
/// 对应原网页 getWeekKey() 里的 "xxx_年份_W周数"。
/// </summary>
public sealed class HistoryStore
{
    private readonly string _path;
    private Dictionary<string, WeekState> _weeks = [];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public HistoryStore(string path)
    {
        _path = path;
        Load();
    }

    /// <summary>按 ISO 8601 周编号（周一为一周开始），与网页原来的算法保持一致。</summary>
    public static string WeekKeyFor(DateTime when)
    {
        var local = when.Kind == DateTimeKind.Utc ? when.ToLocalTime() : when;
        int week = ISOWeek.GetWeekOfYear(local.Date);
        int year = ISOWeek.GetYear(local.Date);
        return $"{year}_W{week}";
    }

    public string CurrentWeekKey => WeekKeyFor(DateTime.Now);

    public WeekState Current => GetOrCreate(CurrentWeekKey);

    /// <summary>全部已保存的周（键按时间正序）。</summary>
    public IReadOnlyList<string> WeekKeys =>
        _weeks.Keys.OrderBy(k => k, StringComparer.Ordinal).ToList();

    /// <summary>读某一周的状态（不存在则返回空状态，不写入）。</summary>
    public WeekState? Peek(string key) =>
        _weeks.TryGetValue(key, out var state) ? state : null;

    /// <summary>清空全部历史（所有周）。</summary>
    public void ClearAll()
    {
        _weeks = [];
        Save();
    }

    public WeekState GetOrCreate(string key)
    {
        if (!_weeks.TryGetValue(key, out var state) || state == null)
        {
            state = new WeekState();
            _weeks[key] = state;
        }
        return state;
    }

    /// <summary>本周剩余天数（到周一 00:00 重置）。</summary>
    public static DateTime WeekResetTime(DateTime now)
    {
        var today = now.Date;
        int daysUntilMonday = ((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7;
        if (daysUntilMonday == 0) daysUntilMonday = 7;
        return today.AddDays(daysUntilMonday);
    }

    public void Load()
    {
        try
        {
            if (!File.Exists(_path)) return;
            var loaded = JsonSerializer.Deserialize(File.ReadAllText(_path), JsonContext.Default.DictionaryStringWeekState);
            if (loaded != null) _weeks = loaded;
        }
        catch
        {
            _weeks = [];
        }
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
            File.WriteAllText(_path, JsonSerializer.Serialize(_weeks, JsonContext.Default.DictionaryStringWeekState));
        }
        catch
        {
            // 写盘失败不打断抽卡
        }
    }

    public static string TodayText(DateTime now) => now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    public static string NowText(DateTime now) => now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);
}
