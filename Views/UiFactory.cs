using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>各页面共用的界面小部件。</summary>
public static class UiFactory
{
    public static FontFamily Font(string key) => (FontFamily)Application.Current.Resources[key];

    /// <summary>
    /// 「图标 + 名字 + 可选细节」的一行。
    /// </summary>
    /// <param name="maxNameWidth">名字最大宽度，超过后收尾省略（配合 ToolTip 看全名）。</param>
    public static StackPanel CharacterChip(Character character, double fontSize, double maxNameWidth)
    {
        var panel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 4,
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Left,
        };

        panel.Children.Add(new TextBlock
        {
            Text = character.Element.Glyph,
            FontFamily = Font("SymbolFont"),
            Foreground = ColorHelper.Brush(character.Element.Color),
            FontSize = fontSize,
            VerticalAlignment = VerticalAlignment.Center,
        });

        panel.Children.Add(new TextBlock
        {
            Text = character.Name,
            FontFamily = Font("UiRegularFont"),
            FontSize = fontSize,
            VerticalAlignment = VerticalAlignment.Center,
            TextWrapping = TextWrapping.NoWrap,
            TextTrimming = TextTrimming.CharacterEllipsis,
            MaxLines = 1,
            MinWidth = 1,
            MaxWidth = maxNameWidth,
            Foreground = (Brush)Application.Current.Resources["TextFillColorPrimaryBrush"],
        });

        // 名字可能很长，悬停看全名
        ToolTipService.SetToolTip(panel, character.Name);

        return panel;
    }
}
