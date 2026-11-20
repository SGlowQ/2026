using System;
using System.Collections.Generic;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Windows.UI;
using WishWinUI.Core;

namespace WishWinUI.Views;

/// <summary>
/// 横向条形图：一行一个项目（标签 + 横条 + 数值）。
/// 条长 = 该值 / 最大值，用于展示抽数分布、周对比这类数据。
/// </summary>
public sealed class BarChart : StackPanel
{
    private readonly List<BarItem> _items = [];

    public BarChart()
    {
        Orientation = Orientation.Vertical;
        Spacing = 10;
    }

    /// <summary>横条的固定高度。</summary>
    public double BarHeight { get; set; } = 10;

    /// <summary>标签列宽。</summary>
    public double LabelWidth { get; set; } = 76;

    /// <summary>数值列宽。</summary>
    public double ValueWidth { get; set; } = 96;

    /// <summary>换一批数据（会自动重画）。</summary>
    public void SetItems(IReadOnlyList<BarItem> items)
    {
        _items.Clear();
        _items.AddRange(items);
        Redraw();
    }

    public void Redraw()
    {
        Children.Clear();
        if (_items.Count == 0) return;

        double max = 0;
        foreach (var it in _items) max = Math.Max(max, Math.Max(0, it.Value));
        if (max <= 0) max = 1;

        foreach (var item in _items)
        {
            var row = new Grid { ColumnSpacing = 10 };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(LabelWidth) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(ValueWidth) });

            // 标签
            var label = new TextBlock
            {
                Text = item.Label,
                FontFamily = UiFactory.Font("UiLightFont"),
                FontWeight = Microsoft.UI.Text.FontWeights.Light,
                FontSize = 12.5,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis,
                Foreground = item.LabelBrush ?? Palette.SecondaryTextBrush,
            };
            Grid.SetColumn(label, 0);
            row.Children.Add(label);

            // 条：底槽 + 填充
            var track = new Grid { VerticalAlignment = VerticalAlignment.Center };
            track.Children.Add(new Rectangle
            {
                Height = BarHeight,
                RadiusX = BarHeight / 2,
                RadiusY = BarHeight / 2,
                Fill = (Brush)Application.Current.Resources["SubtleFillColorSecondaryBrush"],
            });
            track.Children.Add(new Rectangle
            {
                Height = BarHeight,
                RadiusX = BarHeight / 2,
                RadiusY = BarHeight / 2,
                HorizontalAlignment = HorizontalAlignment.Left,
                Fill = item.Brush,
                Width = Math.Max(2, 190 * Math.Max(0, item.Value) / max),
            });
            Grid.SetColumn(track, 1);
            row.Children.Add(track);

            // 数值
            var value = new TextBlock
            {
                Text = item.ValueText,
                FontFamily = UiFactory.Font("UiLightFont"),
                FontWeight = Microsoft.UI.Text.FontWeights.Light,
                FontSize = 12.5,
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Right,
                Foreground = Palette.SecondaryTextBrush,
            };
            Grid.SetColumn(value, 2);
            row.Children.Add(value);

            Children.Add(row);
        }
    }
}

/// <summary>条形图的一项。</summary>
public sealed class BarItem
{
    public string Label { get; init; } = string.Empty;
    public double Value { get; init; }
    public string ValueText { get; init; } = string.Empty;
    public Brush Brush { get; init; } = new SolidColorBrush(Microsoft.UI.Colors.Gray);
    public Brush? LabelBrush { get; init; }
}
