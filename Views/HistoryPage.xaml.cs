using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.Storage.Pickers;
using WinRT.Interop;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>历史记录页：按周记录、每 5 条一页、导出 Excel。</summary>
public sealed partial class HistoryPage : Page
{
    private const int PageSize = 5;
    private int _totalPages = 1;

    private int _page;

    /// <summary>当前查看的周（null 表示本周）。</summary>
    private string? _viewingWeek;
    private bool _suppressWeekChange;

    /// <summary>上次渲染时的数据指纹，用来跳过无意义的重新渲染。</summary>
    private string? _lastSignature;

    /// <summary>
    /// 当前数据指纹：查看的周 + 页码 + 本周 key + **记录条数**。
    /// 记录条数必须带上，否则抽卡后条数变了但指纹没变，页面就不会刷新。
    /// </summary>
    private static string CurrentSignature(int page, string viewingWeek)
    {
        var store = App.Instance.Store;
        int count = store.Peek(viewingWeek)?.History.Count ?? 0;
        return $"{viewingWeek}|{page}|{store.CurrentWeekKey}|{count}";
    }

    public HistoryPage()
    {
        InitializeComponent();

        // 切回来时如果数据没变（同一周、同页码、记录条数也没变），就跳过重建
        Loaded += (_, _) =>
        {
            var signature = CurrentSignature(_page, ViewingWeek);
            if (signature == _lastSignature) return;

            _lastSignature = signature;
            Refresh();
        };
    }

    private MainWindow Host => (MainWindow)App.Instance.MainWindowInstance!;

    private GachaEngine Engine => Host.Engine;

    /// <summary>把 "2026_W46" 这种 key 转成人类可读的「2026 年第 46 周」。</summary>
    private static string FormatWeekKey(string key)
    {
        var parts = key.Split("_W");
        return parts.Length == 2
            ? $"{parts[0]} 年第 {parts[1].TrimStart('0')} 周"
            : key;
    }

    /// <summary>把周 key 换算成该周的日期范围。</summary>
    private static string FormatWeekRange(string key)
    {
        var parts = key.Split("_W");
        if (parts.Length != 2) return key;

        if (!int.TryParse(parts[0], out int year) || !int.TryParse(parts[1], out int week)) return key;

        try
        {
            // ISO 周：找该年的第 week 周的周一
            var jan4 = new DateTime(year, 1, 4);
            int delta = ((int)jan4.DayOfWeek + 6) % 7;   // 周一=0
            var monday = jan4.AddDays(-delta + (week - 1) * 7);
            var sunday = monday.AddDays(6);
            return $"{monday:MM/dd} – {sunday:MM/dd}";
        }
        catch
        {
            return key;
        }
    }

    /// <summary>刷新周下拉框：所有保存过记录的周，倒序排列。</summary>
    private void RefreshWeekPicker()
    {
        _suppressWeekChange = true;

        var keys = App.Instance.Store.WeekKeys
            .Where(k => (App.Instance.Store.Peek(k)?.History.Count ?? 0) > 0)
            .OrderByDescending(k => k, StringComparer.Ordinal)
            .ToList();

        // 本周没有记录也要出现在列表里
        var current = CurrentWeekKey;
        if (!keys.Contains(current)) keys.Insert(0, current);

        WeekPicker.Items.Clear();
        int selectedIndex = 0;
        for (int i = 0; i < keys.Count; i++)
        {
            var label = keys[i] == current
                ? $"{FormatWeekKey(keys[i])}（本周）{FormatWeekRange(keys[i])}"
                : $"{FormatWeekKey(keys[i])}  {FormatWeekRange(keys[i])}";

            WeekPicker.Items.Add(new ComboBoxItem { Content = label, Tag = keys[i] });
            if (keys[i] == ViewingWeek) selectedIndex = i;
        }

        WeekPicker.SelectedIndex = selectedIndex;

        int pos = keys.IndexOf(ViewingWeek);
        PrevWeekButton.IsEnabled = pos >= 0 && pos < keys.Count - 1;   // 倒序：后面的是更早的
        NextWeekButton.IsEnabled = pos > 0;                             // 前面的是更新的
        ThisWeekButton.IsEnabled = !IsViewingCurrent;

        _suppressWeekChange = false;
    }

    private void WeekPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressWeekChange) return;
        if (WeekPicker.SelectedItem is not ComboBoxItem item || item.Tag is not string key) return;

        _viewingWeek = key == CurrentWeekKey ? null : key;
        _page = 0;
        Refresh();
    }

    private void PrevWeek_Click(object sender, RoutedEventArgs e) => ShiftWeek(+1);

    private void NextWeek_Click(object sender, RoutedEventArgs e) => ShiftWeek(-1);

    private void ThisWeek_Click(object sender, RoutedEventArgs e)
    {
        _viewingWeek = null;
        _page = 0;
        Refresh();
    }

    /// <summary>在当前列表里往前/往后挪一周。</summary>
    private void ShiftWeek(int direction)
    {
        var keys = App.Instance.Store.WeekKeys
            .Where(k => (App.Instance.Store.Peek(k)?.History.Count ?? 0) > 0)
            .OrderByDescending(k => k, StringComparer.Ordinal)
            .ToList();
        if (!keys.Contains(CurrentWeekKey)) keys.Insert(0, CurrentWeekKey);

        int pos = keys.IndexOf(ViewingWeek);
        int target = pos + direction;
        if (target < 0 || target >= keys.Count) return;

        _viewingWeek = keys[target] == CurrentWeekKey ? null : keys[target];
        _page = 0;
        Refresh();
    }

    /// <summary>本周 key。</summary>
    private string CurrentWeekKey => App.Instance.Store.CurrentWeekKey;

    /// <summary>当前正在看的周（默认本周）。</summary>
    private string ViewingWeek => _viewingWeek ?? CurrentWeekKey;

    private bool IsViewingCurrent => ViewingWeek == CurrentWeekKey;

    private void Refresh()
    {
        Engine.RefreshWeek();

        var key = ViewingWeek;
        var week = App.Instance.Store.Peek(key);
        var history = week?.History ?? [];

        // 周标题
        HeaderCaption.Text = IsViewingCurrent
            ? $"本周记录 · 每周 {HistoryStore.WeekResetTime(DateTime.Now):MM月dd日}（周一）00:00 重置"
            : $"历史记录 · 查看的是 {FormatWeekKey(key)}";

        RefreshWeekPicker();
        SummaryTotal.Text = history.Count.ToString();
        SummaryFive.Text = history.Count(r => r.Rarity == 0).ToString();
        SummaryFour.Text = history.Count(r => r.Rarity == 1).ToString();
        SummaryThree.Text = history.Count(r => r.Rarity == 2).ToString();

        HistoryList.Children.Clear();
        if (history.Count == 0)
        {
            EmptyHint.Visibility = Visibility.Visible;
            PageText.Text = "0 / 0";
            PrevButton.IsEnabled = false;
            NextButton.IsEnabled = false;
            return;
        }
        EmptyHint.Visibility = Visibility.Collapsed;

        int totalPages = (int)Math.Ceiling(history.Count / (double)PageSize);
        _page = Math.Clamp(_page, 0, totalPages - 1);
        _totalPages = totalPages;
        PageText.Text = $"{_page + 1} / {totalPages}";
        PrevButton.IsEnabled = _page > 0;
        NextButton.IsEnabled = _page < totalPages - 1;


        foreach (var record in history.Skip(_page * PageSize).Take(PageSize))
        {
            var row = new Grid
            {
                Height = 44,
                Padding = new Thickness(12, 0, 12, 0),
                CornerRadius = new CornerRadius(6),
                Background = (Brush)Application.Current.Resources["SubtleFillColorTransparentBrush"],
            };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.4, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.6, GridUnitType.Star) });

            var name = new TextBlock
            {
                Text = record.Name,
                FontFamily = UiFactory.Font("UiRegularFont"),
                FontSize = 15,
                VerticalAlignment = VerticalAlignment.Center,
                Foreground = Palette.RarityDimBrush(record.Rarity),
                TextTrimming = TextTrimming.CharacterEllipsis,
            };
            Grid.SetColumn(name, 0);
            // 名字可能被截断，悬停看全名
            ToolTipService.SetToolTip(name, record.Name);
            row.Children.Add(name);

            var rarity = new TextBlock
            {
                Text = record.RarityLabel,
                FontFamily = UiFactory.Font("UiRegularFont"),
                FontSize = 14,
                VerticalAlignment = VerticalAlignment.Center,
                Foreground = Palette.RarityDimBrush(record.Rarity),
            };
            Grid.SetColumn(rarity, 1);
            row.Children.Add(rarity);

            var time = new TextBlock
            {
                Text = $"{record.Date} {record.Time}",
                FontFamily = UiFactory.Font("UiRegularFont"),
                FontSize = 13,
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Right,
                Foreground = Palette.SecondaryTextBrush,
            };
            Grid.SetColumn(time, 2);
            row.Children.Add(time);

            HistoryList.Children.Add(row);
        }

        // 记下这次渲染的指纹，切回来时数据没变就不用重画
        _lastSignature = CurrentSignature(_page, ViewingWeek);
    }

    private void Prev_Click(object sender, RoutedEventArgs e)
    {
        _page--;
        Refresh();
    }

    /// <summary>点页码文字：弹出数字键盘（适配触屏）。</summary>
    private async void PageText_Click(object sender, RoutedEventArgs e)
    {
        if (_totalPages <= 1) return;

        var target = await NumberPad.ShowAsync(
            XamlRoot,
            hint: $"一共 {_totalPages} 页",
            current: _page + 1,
            min: 1,
            max: _totalPages);

        if (target == null) return;

        _page = Math.Clamp(target.Value - 1, 0, _totalPages - 1);
        Refresh();
    }

    private void Next_Click(object sender, RoutedEventArgs e)
    {
        _page++;
        Refresh();
    }

    private async void Export_Click(object sender, RoutedEventArgs e)
    {
        var week = App.Instance.Store.Peek(ViewingWeek);
        var history = week?.History ?? [];
        if (history.Count == 0)
        {
            Host.ShowToast("当前这一周没有可导出的记录。", error: true);
            return;
        }

        var picker = new FileSavePicker
        {
            SuggestedFileName = $"{ViewingWeek}_祈愿记录",
        };
        picker.FileTypeChoices.Add("Excel 工作簿", new List<string> { ".xlsx" });
        picker.FileTypeChoices.Add("CSV 表格", new List<string> { ".csv" });
        picker.FileTypeChoices.Add("纯文本", new List<string> { ".txt" });

        InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));
        var file = await picker.PickSaveFileAsync();
        if (file == null) return;

        try
        {
            var ext = Path.GetExtension(file.Path).ToLowerInvariant();
            if (ext == ".xlsx")
            {
                await File.WriteAllBytesAsync(file.Path, ExcelExporter.Build(history));
            }
            else if (ext == ".csv")
            {
                // 带 BOM，Excel 打开中文不乱码
                await File.WriteAllTextAsync(file.Path, BuildCsv(history), new System.Text.UTF8Encoding(true));
            }
            else
            {
                await File.WriteAllTextAsync(file.Path, BuildTxt(history), new System.Text.UTF8Encoding(true));
            }

            Host.ShowToast($"已导出 {history.Count} 条记录（{ext.TrimStart('.').ToUpperInvariant()}）");
        }
        catch (Exception ex)
        {
            Host.ShowToast("导出失败：" + ex.Message, error: true);
        }
    }

    /// <summary>导出全部周的历史记录到一个文件，带周次列。</summary>
    private async void ExportAll_Click(object sender, RoutedEventArgs e)
    {
        var store = App.Instance.Store;
        var keys = store.WeekKeys
            .Where(k => (store.Peek(k)?.History.Count ?? 0) > 0)
            .OrderByDescending(k => k, StringComparer.Ordinal)
            .ToList();

        if (keys.Count == 0)
        {
            Host.ShowToast("还没有任何历史记录", error: true);
            return;
        }

        var picker = new FileSavePicker
        {
            SuggestedFileName = $"祈愿记录_全部_共{keys.Count}周",
        };
        picker.FileTypeChoices.Add("CSV 表格", new List<string> { ".csv" });
        picker.FileTypeChoices.Add("纯文本", new List<string> { ".txt" });

        InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));
        var file = await picker.PickSaveFileAsync();
        if (file == null) return;

        try
        {
            var ext = Path.GetExtension(file.Path).ToLowerInvariant();
            var sb = new System.Text.StringBuilder();

            if (ext == ".csv")
            {
                sb.AppendLine("周次,日期,时间,名字,星级,是否UP,捕获明光");
                foreach (var key in keys)
                {
                    foreach (var r in store.Peek(key)!.History)
                    {
                        var name = r.Name.Replace("\"", "\"\"");
                        sb.AppendLine($"{key},{r.Date},{r.Time},\"{name}\",{r.RarityText},{(r.IsUP ? "是" : "否")},{(r.TriggeredCaptureLight ? "是" : "否")}");
                    }
                }
                await File.WriteAllTextAsync(file.Path, sb.ToString(), new System.Text.UTF8Encoding(true));
            }
            else
            {
                sb.AppendLine($"祈愿记录 · 全部 {keys.Count} 周");
                sb.AppendLine(new string('=', 50));
                foreach (var key in keys)
                {
                    var week = store.Peek(key)!;
                    sb.AppendLine();
                    sb.AppendLine($"【{FormatWeekKey(key)}】  共 {week.History.Count} 抽");
                    sb.AppendLine(new string('-', 50));
                    foreach (var r in week.History)
                    {
                        var up = r.IsUP ? " UP" : "";
                        var light = r.TriggeredCaptureLight ? "（捕获明光）" : "";
                        sb.AppendLine($"{r.Date} {r.Time}  {r.Name}  {r.RarityText}{up}{light}");
                    }
                }
                await File.WriteAllTextAsync(file.Path, sb.ToString(), new System.Text.UTF8Encoding(true));
            }

            int total = keys.Sum(k => store.Peek(k)!.History.Count);
            Host.ShowToast($"已导出 {keys.Count} 周共 {total} 条记录");
        }
        catch (Exception ex)
        {
            Host.ShowToast("导出失败：" + ex.Message, error: true);
        }
    }

    private static string BuildCsv(IReadOnlyList<HistoryRecord> history)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("日期,时间,名字,星级,是否UP,捕获明光");
        foreach (var r in history)
        {
            var name = r.Name.Replace("\"", "\"\"");
            sb.AppendLine($"{r.Date},{r.Time},\"{name}\",{r.RarityText},{(r.IsUP ? "是" : "否")},{(r.TriggeredCaptureLight ? "是" : "否")}");
        }
        return sb.ToString();
    }

    private static string BuildTxt(IReadOnlyList<HistoryRecord> history)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"祈愿记录 · 共 {history.Count} 条");
        sb.AppendLine(new string('-', 40));
        foreach (var r in history)
        {
            var up = r.IsUP ? " UP" : "";
            var light = r.TriggeredCaptureLight ? "（捕获明光）" : "";
            sb.AppendLine($"{r.Date} {r.Time}  {r.Name}  {r.RarityText}{up}{light}");
        }
        return sb.ToString();
    }


    }
