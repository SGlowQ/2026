using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;

namespace WishWinUI.Services;

/// <summary>
/// 全局字体兜底：把界面上所有文字控件统一换成同一个字体。
/// 有些控件（比如标题栏 TitleBar）的字体写死在控件模板里，
/// 靠资源字典覆盖不到，只能在运行时遍历可视化树补上。
/// </summary>
public static class FontHelper
{
    private static FontFamily? _font;

    /// <summary>要统一的字体（从 UiRegularFont 资源取，保证和资源字典一致）。</summary>
    private static FontFamily Font =>
        _font ??= (FontFamily)Application.Current.Resources["UiRegularFont"];

    /// <summary>把 root 及其所有子控件里的文字都换成统一字体。</summary>
    public static void ApplyAll(DependencyObject root) => Walk(root, 0);

    private static void Walk(DependencyObject node, int depth)
    {
        // 防止极端深的树造成卡顿
        if (depth > 40) return;

        switch (node)
        {
            // 图标控件绝对不能碰，连它的子节点也不能进。
            // FontIcon / SymbolIcon 内部是一个用 Segoe Fluent Icons 显示字形的 TextBlock，
            // 一旦把那个 TextBlock 的字体换掉，图标就变成空白或消失
            // （导航图标、提示条的 √ 勾、按钮图标都会没）。
            case FontIcon or SymbolIcon or AnimatedIcon or ImageIcon:
                return;
        }

        // 提示条 InfoBar 的图标是包在 Grid/Border 里的 SymbolIcon，
        // 上面的 case 已经处理；这里只改真正的文字控件。
        switch (node)
        {
            case TextBlock tb:
                // 用 Fluent 图标字体显示字形的 TextBlock 一律不碰
                if (IsIconFont(tb.FontFamily)) return;
                if (!Equals(tb.FontFamily, Font)) tb.FontFamily = Font;
                break;

            // Control 只给真正显示文字的（Button/TextBox 等）换字体。
            // ContentControl（含 InfoBar/ContentPresenter）改了字体会被内部图标继承，
            // 所以这里不处理基类，交给子节点判断。
            case ButtonBase or TextBox or AutoSuggestBox:
                if (!Equals(((Control)node).FontFamily, Font))
                    ((Control)node).FontFamily = Font;
                break;
        }

        int count = VisualTreeHelper.GetChildrenCount(node);
        for (int i = 0; i < count; i++)
        {
            Walk(VisualTreeHelper.GetChild(node, i), depth + 1);
        }
    }

    /// <summary>是不是 Segoe Fluent Icons / MDL2 这类图标字体。</summary>
    private static bool IsIconFont(FontFamily? family)
    {
        var name = family?.Source ?? string.Empty;
        return name.Contains("Fluent Icons", System.StringComparison.OrdinalIgnoreCase)
            || name.Contains("Segoe MDL2", System.StringComparison.OrdinalIgnoreCase)
            || name.Contains("Segoe UI Symbol", System.StringComparison.OrdinalIgnoreCase);
    }
}
