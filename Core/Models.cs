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

}
