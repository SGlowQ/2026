using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>抽卡统计页：基于全部历史记录计算出货率、保底、UP 命中率等。</summary>
public sealed partial class StatsPage : Page
{
    public StatsPage()
    {
        InitializeComponent();
        Loaded += (_, _) => Refresh();
    }

    private void Refresh()
    {
        var store = App.Instance.Store;

        // 汇总所有周的历史
        var all = new List<(string WeekKey, HistoryRecord Record)>();
        var weeks = store.WeekKeys;
        foreach (var key in weeks)
        {
            var week = store.Peek(key);
            if (week == null) continue;
            foreach (var record in week.History)
            {
                all.Add((key, record));
            }
        }

        if (all.Count == 0)
        {
            CaptionText.Text = "还没有任何抽卡记录，先去「祈愿」页抽几次吧";
            TotalDraws.Text = "0";
            TotalWeeks.Text = "0";
            AvgPerWeek.Text = "0";
            RarityPanel.Children.Clear();
            RarityPanel.Children.Add(new TextBlock
            {
                Text = "暂无数据",
                Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
            });
            AvgFivePity.Text = "—";
            BestFivePity.Text = "—";
            UpRate.Text = "—";
            CaptureLightCount.Text = "0";
            AvgFourPity.Text = "—";
            BusiestWeek.Text = "—";
            return;
        }

        int total = all.Count;
        int fiveCount = all.Count(x => x.Record.Rarity == 0);
        int fourCount = all.Count(x => x.Record.Rarity == 1);
        int threeCount = all.Count(x => x.Record.Rarity == 2);

        CaptionText.Text = $"统计全部历史记录，共 {weeks.Count} 周 {total} 抽";

        TotalDraws.Text = total.ToString();
        TotalWeeks.Text = weeks.Count.ToString();
        AvgPerWeek.Text = Math.Round(total / (double)weeks.Count).ToString();

        // ---- 星级分布条 ----
        RarityPanel.Children.Clear();
        AddRarityBar("五星", fiveCount, total, "#E8B923", expected: 0.6);
        AddRarityBar("四星", fourCount, total, "#A259FF", expected: 5.1);
        AddRarityBar("三星", threeCount, total, "#03a9f4", expected: 94.3);

        // ---- 五星保底统计 ----
        // 按时间正序排列（历史里是最新在前）
        var ordered = all.OrderBy(x => x.Record.Date).ThenBy(x => x.Record.Time).ToList();

        var fiveGaps = new List<int>();   // 每次出五星用了多少抽
        int pity = 0;
        foreach (var (_, record) in ordered)
        {
            pity++;
            if (record.Rarity == 0)
            {
                fiveGaps.Add(pity);
                pity = 0;
            }
        }

        AvgFivePity.Text = fiveGaps.Count > 0
            ? $"{fiveGaps.Average():0.0} 抽"
            : "—";
        BestFivePity.Text = fiveGaps.Count > 0
            ? $"{fiveGaps.Min()} 抽"
            : "—";

        // ---- UP 命中率 ----
        var fiveRecords = all.Where(x => x.Record.Rarity == 0).ToList();
        int fiveUp = fiveRecords.Count(x => x.Record.IsUP);
        UpRate.Text = fiveRecords.Count > 0
            ? $"{fiveUp * 100.0 / fiveRecords.Count:0.0}%"
            : "—";

        // ---- 捕获明光 ----
        CaptureLightCount.Text = all.Count(x => x.Record.TriggeredCaptureLight).ToString();

        // ---- 四星保底 ----
        var fourGaps = new List<int>();
        int fourPity = 0;
        foreach (var (_, record) in ordered)
        {
            fourPity++;
            if (record.Rarity <= 1)
            {
                fourGaps.Add(fourPity);
                fourPity = 0;
            }
        }
        AvgFourPity.Text = fourGaps.Count > 0
            ? $"{fourGaps.Average():0.0} 抽"
            : "—";

        // ---- 抽得最多的一周 ----
        var busiest = weeks
            .Select(k => (Key: k, Count: store.Peek(k)?.History.Count ?? 0))
            .OrderByDescending(x => x.Count)
            .FirstOrDefault();
        BusiestWeek.Text = busiest.Count > 0
            ? $"{busiest.Key.Replace("_W", " 年第 ")} 周 · {busiest.Count} 抽"
            : "—";
    }

    /// <summary>一行：星级名 + 占比条 + 数量与占比 + 理论值对比。</summary>
    private void AddRarityBar(string label, int count, int total, string color, double expected)
    {
        double actual = count * 100.0 / total;

        var grid = new Grid { ColumnSpacing = 10 };
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(56) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        // Auto 而不是固定宽度，避免「理论 94.3%）」这种长文字被裁掉
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        var nameBlock = new TextBlock
        {
            Text = label,
            FontSize = 14,
            VerticalAlignment = VerticalAlignment.Center,
            Foreground = ColorHelper.Brush(color),
            FontFamily = UiFactory.Font("UiBlackFont"),
            FontWeight = Microsoft.UI.Text.FontWeights.Black,
        };
        Grid.SetColumn(nameBlock, 0);
        grid.Children.Add(nameBlock);

        var bar = new ProgressBar
        {
            Maximum = 100,
            Value = Math.Clamp(actual, 0, 100),
            Height = 6,
            VerticalAlignment = VerticalAlignment.Center,
            Foreground = ColorHelper.Brush(color),
        };
        Grid.SetColumn(bar, 1);
        grid.Children.Add(bar);

        var detail = new TextBlock
        {
            Text = $"{count} 次 · {actual:0.0}%（理论 {expected}%）",
            FontSize = 12,
            VerticalAlignment = VerticalAlignment.Center,
            TextWrapping = TextWrapping.NoWrap,
            Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
        };
        Grid.SetColumn(detail, 2);
        grid.Children.Add(detail);

        RarityPanel.Children.Add(grid);
    }
}
