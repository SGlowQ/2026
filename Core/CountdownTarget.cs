using System.Text.Json.Serialization;

namespace WishWinUI.Core;

/// <summary>
/// 一个倒计时目标：名字 + 时间。
/// 用户可以保存多个（比如「春节」「生日」「期末」），随时切换。
/// </summary>
public sealed class CountdownTarget
{
    /// <summary>唯一标识（新建时生成）。</summary>
    public string Id { get; set; } = "";

    /// <summary>显示名，比如「2027 丁未年春节」「小王生日」。</summary>
    public string Name { get; set; } = "";

    /// <summary>目标时间（本地时间，存字符串便于直接编辑 JSON）。</summary>
    public string Date { get; set; } = "";

    /// <summary>是不是自动生成的春节目标（不可删除）。</summary>
    public bool IsSpringFestival { get; set; }

    /// <summary>下拉框里显示的文字。</summary>
    public override string ToString() => Name.Length > 0 ? $"{Name}（{When:yyyy-MM-dd}）" : When.ToString("yyyy-MM-dd");

    [JsonIgnore]
    public DateTime When =>
        DateTime.TryParse(Date, out var parsed) ? parsed : AppSettings.DefaultTargetDate;

    /// <summary>用某个春节生成目标，名字带天干地支。</summary>
    public static CountdownTarget ForSpring(DateTime spring)
    {
        return new CountdownTarget
        {
            Id = "spring",
            Name = $"{spring.Year} {GanZhi(spring.Year)}年春节",
            Date = spring.ToString("yyyy-MM-dd HH:mm:ss"),
            IsSpringFestival = true,
        };
    }

    /// <summary>年份对应的天干地支，比如 2027 → 丁未。</summary>
    public static string GanZhi(int year)
    {
        // 1984 年是甲子年，做基准
        string[] stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
        string[] branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
        int offset = ((year - 1984) % 60 + 60) % 60;
        return stems[offset % 10] + branches[offset % 12];
    }
}
