using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>抽卡统计页：基于全部历史记录计算出货率、保底、UP、捕获明光、分布等。</summary>
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
            ClearAll();
            return;
        }

        int total = all.Count;
        int fiveCount = all.Count(x => x.Record.Rarity == 0);
        int fourCount = all.Count(x => x.Record.Rarity == 1);
        int threeCount = all.Count(x => x.Record.Rarity == 2);

        // 按时间正序排列（历史里是最新在前）
        var ordered = all.OrderBy(x => x.Record.Date).ThenBy(x => x.Record.Time).ToList();

        // ---------------- 总览 ----------------
        var days = all
            .Select(x => x.Record.Date)
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Distinct()
            .Count();

        CaptionText.Text = $"统计全部历史记录，共 {weeks.Count} 周 {total} 抽";
        TotalDraws.Text = total.ToString();
        TotalWeeks.Text = weeks.Count.ToString();
        AvgPerWeek.Text = Math.Round(total / (double)weeks.Count).ToString();
        DrawDays.Text = days.ToString();

        // ---------------- 星级分布圆环 ----------------
        double fivePercent = Math.Clamp(fiveCount * 100.0 / total, 0, 100);
        double fourPercent = Math.Clamp(fourCount * 100.0 / total, 0, 100);
        double threePercent = Math.Clamp(threeCount * 100.0 / total, 0, 100);

        RarityDonut.SetSegments(
        [
            new DonutSegment { Value = fiveCount,  Brush = Palette.RarityBrush(0), Label = "五星" },
            new DonutSegment { Value = fourCount,  Brush = Palette.RarityBrush(1), Label = "四星" },
            new DonutSegment { Value = threeCount, Brush = Palette.RarityBrush(2), Label = "三星" },
        ]);
        RarityDonut.SetCenter(total.ToString(), "总抽数");
        RarityDonut.SetCenterBrush(Palette.BodyTextBrush);

        FivePityText.Text = $"{fiveCount} 次 · {fivePercent:0.0}%（基础 0.600%）";
        FourPityText.Text = $"{fourCount} 次 · {fourPercent:0.0}%（基础 5.100%）";
        ThreePityText.Text = $"{threeCount} 次 · {threePercent:0.0}%（基础 94.300%）";

        // ---------------- 五星抽数间隔 ----------------
        var fiveGaps = new List<int>();
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
        int unfinishedPity = pity;   // 当前进度（还没出五星）

        AvgFivePity.Text = fiveGaps.Count > 0 ? $"{fiveGaps.Average():0.0}" : "—";
        BestFivePity.Text = fiveGaps.Count > 0 ? fiveGaps.Min().ToString() : "—";
        WorstFivePity.Text = fiveGaps.Count > 0 ? fiveGaps.Max().ToString() : "—";

        // ---------------- 四星抽数间隔 ----------------
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
        AvgFourPity.Text = fourGaps.Count > 0 ? $"{fourGaps.Average():0.0}" : "—";

        FiveStarCount.Text = fiveCount.ToString();
        FourStarCount.Text = fourCount.ToString();

        // ---------------- 保底进度 ----------------
        var current = store.Current;
        BufferFive.Text = $"{current.FiveStarPity} / 90";
        BufferFour.Text = $"{current.FourStarPity} / 10";

        // ---------------- 抽得最多的一周 ----------------
        var busiest = weeks
            .Select(k => (Key: k, Count: store.Peek(k)?.History.Count ?? 0))
            .OrderByDescending(x => x.Count)
            .FirstOrDefault();
        BusiestWeek.Text = busiest.Count > 0
            ? $"{busiest.Key.Replace("_W", " 年第 ")} 周"
            : "—";

        // ---------------- UP 与捕获明光 ----------------
        var fiveRecords = all.Where(x => x.Record.Rarity == 0).ToList();
        int fiveUp = fiveRecords.Count(x => x.Record.IsUP);
        int fiveNonUp = fiveRecords.Count - fiveUp;

        UpRate.Text = fiveRecords.Count > 0
            ? $"{fiveUp * 100.0 / fiveRecords.Count:0.0}%"
            : "—";
        UpCount.Text = fiveRecords.Count > 0
            ? $"{fiveUp} / {fiveNonUp}"
            : "—";

        var fourRecords = all.Where(x => x.Record.Rarity == 1).ToList();
        int fourUp = fourRecords.Count(x => x.Record.IsUP);
        FourUpRate.Text = fourRecords.Count > 0
            ? $"{fourUp * 100.0 / fourRecords.Count:0.0}%"
            : "—";

        int captureCount = all.Count(x => x.Record.TriggeredCaptureLight);
        CaptureLightCount.Text = captureCount.ToString();
        CaptureLightRate.Text = fiveRecords.Count > 0
            ? $"{captureCount * 100.0 / fiveRecords.Count:0.0}%"
            : "—";

        // 吃满 90 抽硬保底出货的次数
        int pityTrigger = fiveGaps.Count(g => g >= 90);
        PityTriggerCount.Text = $"{pityTrigger} 次";

        // ---------------- 五星抽数分布条形图 ----------------
        BuildFiveDistribution(fiveGaps);

        // ---------------- 每周抽卡量 ----------------
        BuildWeekBars(store, weeks);

        // ---------------- 出货最多的名字 ----------------
        BuildPersonBars(all);
    }

    /// <summary>把五星间隔按区间分桶，画成条形图。</summary>
    private void BuildFiveDistribution(List<int> gaps)
    {
        if (gaps.Count == 0)
        {
            FiveDistBars.SetItems([]);
            return;
        }

        // 分桶：[1-10], [11-20], ..., [81-89], [90]
        var buckets = new List<(string Label, int Count, int Min, int Max)>();
        for (int start = 1; start <= 81; start += 10)
        {
            int end = start + 9;
            int count = gaps.Count(g => g >= start && g <= end);
            buckets.Add(($"{start}–{end}", count, start, end));
        }
        int at90 = gaps.Count(g => g >= 90);
        buckets.Add(("90", at90, 90, 999));

        // 只显示有数据的档位；如果完全没有数据，至少保留一个提示
        var items = buckets
            .Where(b => b.Count > 0)
            .Select(b => new BarItem
            {
                Label = b.Label,
                Value = b.Count,
                ValueText = $"{b.Count} 次",
                Brush = Palette.RarityBrush(0),
            })
            .ToList();

        FiveDistBars.SetItems(items);
    }

    /// <summary>每周总抽数条形图（最近 12 周）。</summary>
    private void BuildWeekBars(HistoryStore store, IReadOnlyList<string> weeks)
    {
        var rows = weeks
            .Select(k => (Key: k, Count: store.Peek(k)?.History.Count ?? 0))
            .Where(x => x.Count > 0)
            .OrderBy(x => x.Key, StringComparer.Ordinal)
            .ToList();

        rows = rows.TakeLast(12).ToList();

        var items = rows.Select(x => new BarItem
        {
            Label = x.Key.Replace("_W", "/W"),
            Value = x.Count,
            ValueText = $"{x.Count} 抽",
            Brush = Palette.RarityBrush(1),
        }).ToList();

        WeekBars.SetItems(items);
    }

    /// <summary>被抽中次数最多的前 10 位。</summary>
    private void BuildPersonBars(List<(string WeekKey, HistoryRecord Record)> all)
    {
        var top = all
            .GroupBy(x => x.Record.Name)
            .Select(g => (Name: g.Key, Count: g.Count()))
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Name)
            .Take(10)
            .ToList();

        var items = top.Select((x, i) => new BarItem
        {
            Label = x.Name,
            Value = x.Count,
            ValueText = $"{x.Count} 次",
            Brush = Palette.RarityBrush(2),
        }).ToList();

        PersonBars.SetItems(items);
    }

    /// <summary>没有记录时把界面清空。</summary>
    private void ClearAll()
    {
        CaptionText.Text = "还没有任何抽卡记录，先去「祈愿」页抽几次吧";
        TotalDraws.Text = "0";
        TotalWeeks.Text = "0";
        AvgPerWeek.Text = "0";
        DrawDays.Text = "0";

        RarityDonut.SetSegments([]);
        RarityDonut.SetCenter("0", "总抽数");
        RarityDonut.SetCenterBrush(Palette.BodyTextBrush);
        FivePityText.Text = "暂无数据";
        FourPityText.Text = string.Empty;
        ThreePityText.Text = string.Empty;

        AvgFivePity.Text = "—";
        BestFivePity.Text = "—";
        WorstFivePity.Text = "—";
        AvgFourPity.Text = "—";
        FiveStarCount.Text = "0";
        FourStarCount.Text = "0";
        BufferFive.Text = "—";
        BufferFour.Text = "—";
        BusiestWeek.Text = "—";

        UpRate.Text = "—";
        UpCount.Text = "—";
        FourUpRate.Text = "—";
        CaptureLightCount.Text = "0";
        CaptureLightRate.Text = "—";
        PityTriggerCount.Text = "—";

        FiveDistBars.SetItems([]);
        WeekBars.SetItems([]);
        PersonBars.SetItems([]);
    }
}
