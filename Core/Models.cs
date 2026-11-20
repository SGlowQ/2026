using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
using Windows.UI;

namespace WishWinUI.Core;

/// <summary>名字上的原神元素点缀（火 水 风 雷 草 冰 岩）。</summary>
public sealed record ElementStyle(string Name, string Glyph, string Color)
{
    public static readonly ElementStyle[] All =
    [
        // 元素图标：user 指定
        new("水", "\uD83D\uDCA7", "#4fc3f7"),  // 💧
        new("火", "\uD83D\uDD25", "#ff6752"),  // 🔥
        new("雷", "\u26A1",        "#b388ff"),  // ⚡
        new("草", "\uD83C\uDF40", "#a0d84f"),  // 🍀
        new("冰", "\u2744",        "#99d9ea"),  // ❄
        new("岩", "\uD83E\uDEA8", "#ffcc29"),  // 🪨
        new("风", "\uD83C\uDF00", "#73e6c2"),  // 🌀
    ];

    public static ElementStyle Random() => All[System.Random.Shared.Next(All.Length)];
}

/// <summary>一张角色卡：名字 + 星级索引（0=五星 1=四星 2=三星）+ 元素点缀。</summary>
public sealed class Character(string name, int rarity, ElementStyle element)
{
    public string Name { get; } = name;
    public int Rarity { get; } = rarity;
    public ElementStyle Element { get; } = element;

    public string RarityText => Rarity switch { 0 => "五星", 1 => "四星", _ => "三星" };

    /// <summary>角色池里渲染用的颜色（星级色）。</summary>
    public string RarityColor => Palette.RarityColor(Rarity);
}

/// <summary>一次抽卡的结果。</summary>
public sealed class DrawResult
{
    public required Character Winner { get; init; }
    public int RarityIndex => Winner.Rarity;
    public bool IsUP { get; init; }
    public bool TriggeredCaptureLight { get; init; }
}

/// <summary>页面里所有用到的配色（跟原网页 css 对齐）。</summary>
public static class Palette
{
    public const string Gold = "#FFD700";
    public const string Purple = "#A259FF";
    public const string Blue = "#00bfff";
    public const string GoldDim = "#ffeb3b";
    public const string PurpleDim = "#bb86fc";
    public const string BlueDim = "#03a9f4";

    public static string RarityColor(int rarity) => rarity switch { 0 => Gold, 1 => Purple, _ => Blue };
    public static string RarityDimColor(int rarity) => rarity switch { 0 => GoldDim, 1 => PurpleDim, _ => BlueDim };

    /// <summary>
    /// 按当前主题取星级色。
    /// 注意：Application.Resources.TryGetValue 查不到 ThemeDictionaries 里的资源，
    /// 所以这里自己判断深浅主题，直接返回对应的颜色（和 ThemeResources.xaml 保持一致）。
    /// </summary>
    public static Brush RarityBrush(int rarity)
    {
        var hex = IsLightTheme
            ? rarity switch { 0 => LightFive, 1 => LightFour, _ => LightThree }
            : rarity switch { 0 => DarkFive, 1 => DarkFour, _ => DarkThree };
        return new SolidColorBrush(FromHex(hex));
    }

    /// <summary>名字/文字用的浅一档星级色（同样跟随主题）。</summary>
    public static Brush RarityDimBrush(int rarity)
    {
        var hex = IsLightTheme
            ? rarity switch { 0 => LightFiveDim, 1 => LightFourDim, _ => LightThreeDim }
            : rarity switch { 0 => DarkFiveDim, 1 => DarkFourDim, _ => DarkThreeDim };
        return new SolidColorBrush(FromHex(hex));
    }

    // 深色主题（和 ThemeResources.xaml 的 Dark 字典一致）
    private const string DarkFive = "#E8B923";
    private const string DarkFour = "#9B6DE8";
    private const string DarkThree = "#3FA9F5";
    private const string DarkFiveDim = "#FFEB3B";
    private const string DarkFourDim = "#BB86FC";
    private const string DarkThreeDim = "#03A9F4";

    // 浅色主题（和 ThemeResources.xaml 的 Light 字典一致）
    private const string LightFive = "#8A6100";
    private const string LightFour = "#6B3FA0";
    private const string LightThree = "#0B6FA8";
    private const string LightFiveDim = "#7A5600";
    private const string LightFourDim = "#5E3592";
    private const string LightThreeDim = "#0A6394";

    /// <summary>当前是不是浅色主题。由 MainWindow 在应用主题时写入。</summary>
    public static bool IsLightTheme { get; set; }

    /// <summary>
    /// 普通正文色（跟随主题）。
    /// 不能直接用 Application.Current.Resources["TextFillColorPrimaryBrush"]：
    /// 那是应用级资源，不随页面的 RequestedTheme 变化，浅色主题下还是白色，白底上看不见。
    /// </summary>
    public static Brush BodyTextBrush =>
        new SolidColorBrush(IsLightTheme ? Color.FromArgb(255, 26, 26, 26) : Color.FromArgb(255, 255, 255, 255));

    /// <summary>次要文字色（说明文字、单位等），跟随主题。</summary>
    public static Brush SecondaryTextBrush =>
        new SolidColorBrush(IsLightTheme ? Color.FromArgb(255, 96, 96, 96) : Color.FromArgb(255, 170, 170, 170));

    /// <summary>三级文字色（分隔符、极淡的提示），跟随主题。</summary>
    public static Brush TertiaryTextBrush =>
        new SolidColorBrush(IsLightTheme ? Color.FromArgb(255, 150, 150, 150) : Color.FromArgb(255, 120, 120, 120));

    private static Color FromHex(string hex)
    {
        var v = hex.TrimStart('#');
        return Color.FromArgb(255,
            Convert.ToByte(v.Substring(0, 2), 16),
            Convert.ToByte(v.Substring(2, 2), 16),
            Convert.ToByte(v.Substring(4, 2), 16));
    }
}
