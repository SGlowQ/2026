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
    /// <summary>
    /// 上次统计时的数据指纹（总抽数 + 周数）。
    /// 切回统计页时如果数据没变，就直接复用上次的结果，不重算也不重绘，
    /// 避免每次切页都卡一下。
    /// </summary>
    private string? _lastSignature;

    public StatsPage()
    {
        InitializeComponent();
        Loaded += (_, _) =>
        {
            var store = App.Instance.Store;

            int total = 0;
            foreach (var key in store.WeekKeys)
            {
                total += store.Peek(key)?.History.Count ?? 0;
            }

            var signature = $"{store.WeekKeys.Count}|{total}";
            if (signature == _lastSignature) return;   // 数据没变，跳过重算

            _lastSignature = signature;
            Refresh();
        };
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

            // 圆环清空，右侧显示「暂无数据」
            RarityDonut.SetSegments([]);
            RarityDonut.SetCenter("0", "总抽数");
            FivePityText.Text = "暂无数据";
            FourPityText.Text = string.Empty;
            ThreePityText.Text = string.Empty;
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

        // ---- 星级分布（圆环） ----
        double fivePercent = Math.Clamp(fiveCount * 100.0 / total, 0, 100);
        double fourPercent = Math.Clamp(fourCount * 100.0 / total, 0, 100);
        double threePercent = Math.Clamp(threeCount * 100.0 / total, 0, 100);

        // 每段弧长 = 该星级次数 / 总抽数，三段加起来正好一圈
        RarityDonut.SetSegments(
        [
            new DonutSegment { Value = fiveCount,  Brush = Palette.RarityBrush(0), Label = "五星" },
            new DonutSegment { Value = fourCount,  Brush = Palette.RarityBrush(1), Label = "四星" },
            new DonutSegment { Value = threeCount, Brush = Palette.RarityBrush(2), Label = "三星" },
        ]);
        RarityDonut.SetCenter(total.ToString(), "总抽数");
        RarityDonut.SetCenterBrush(Palette.BodyTextBrush);

        FivePityText.Text = $"{fiveCount} 次 · {fivePercent:0.0}%（理论 0.6%）";
        FourPityText.Text = $"{fourCount} 次 · {fourPercent:0.0}%（理论 5.1%）";
        ThreePityText.Text = $"{threeCount} 次 · {threePercent:0.0}%（理论 94.3%）";
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
}
