using System.Linq;
using System;
using System.Threading.Tasks;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Windows.ApplicationModel.DataTransfer;
using Windows.UI;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>倒计时页：天/时/分/秒/毫秒、一句话、本周抽卡状态。</summary>
public sealed partial class CountdownPage : Page
{
    private readonly DispatcherTimer _timer;
    private readonly DispatcherQueueTimer _quoteTimer;
    private bool _synced;

    public CountdownPage()
    {
        InitializeComponent();

        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(33) };
        _timer.Tick += (_, _) => UpdateCountdown();

        _quoteTimer = DispatcherQueue.CreateTimer();
        _quoteTimer.Tick += async (_, _) => await LoadQuoteAsync();

        Loaded += async (_, _) =>
        {
            RefreshTargetPicker();
            _timer.Start();
            RescaleDaysText();
            UpdateCountdown();
            StartGradientAnimation();

            // 切回来时：保留原来那句一言，不重新拉取，只是重新开始 1 分钟计时
            if (string.IsNullOrEmpty(QuoteText.Text) || QuoteText.Text == "正在加载……")
            {
                await LoadQuoteAsync();
            }
            RestartQuoteTimer();

            if (!_synced)
            {
                await NetworkTime.SyncAsync();
                _synced = true;
                UpdateTimeSourceText();
                UpdateCountdown();
            }
        };
        Unloaded += (_, _) =>
        {
            _timer.Stop();
            // 切走就把一言计时停掉，切回来再重新计 1 分钟
            _quoteTimer.Stop();
            StopGradientAnimation();
        };
        // 窗口宽度变了就重新算天数字号
        SizeChanged += (_, _) => RescaleDaysText();
    }

    private App HostApp => App.Instance;

    private AppSettings Settings => HostApp.Settings;

    /// <summary>当前生效的目标（自定义优先，否则自动用春节）。</summary>
    private CountdownTarget CurrentTarget => Settings.CurrentTarget;

    private void UpdateCountdown()
    {
        var now = NetworkTime.Now;
        var current = CurrentTarget;
        var target = current.When;
        var distance = target - now;

        UpdateTimeSourceText();

        bool passed = distance.TotalMilliseconds <= 0;
        var span = passed ? now - target : distance;

        long totalMs = (long)Math.Floor(span.TotalMilliseconds);

        // 天数：直接截断到 1 位小数（9.96 天显示 9.9，不进位成 10.0）
        // 一整天 = 1000*60*60*24 毫秒，一位小数的单位是它的十分之一
        const long MsPerDay = 1000L * 60 * 60 * 24;
        long tenthsOfDay = totalMs / (MsPerDay / 10);
        string dayText = $"{tenthsOfDay / 10}.{tenthsOfDay % 10}";
        // 小时：总小时数（不按天取余）
        long totalHours = totalMs / (1000L * 60 * 60);

        if (passed)
        {
            TargetCaption.Text = $"「{current.Name}」({target:yyyy年M月d日 HH:mm}) 已达成";
            YearProgressText.Text = "🎉 目标已达成！";
        }
        else
        {
            TargetCaption.Text = "距目标日期还有";
            YearProgressText.Text = (target.Date - now.Date).TotalDays > 0
                ? $"距离目标还剩下 {dayText} 天"
                : "目标日期就在今天";
        }

        // 大字号天数（已达成时淡一点，提示可以切到下一个目标）
        DaysText.Text = dayText + "天";
        DaysText.Opacity = passed ? 0.75 : 1.0;

        // 时 / 分 / 秒 / 毫秒
        HoursText.Text = totalHours.ToString("00");
        MinutesText.Text = (totalMs % (1000 * 60 * 60) / (1000 * 60)).ToString("00");
        SecondsText.Text = (totalMs % (1000 * 60) / 1000).ToString("00");
        MillisText.Text = (totalMs % 1000).ToString("000");
    }

    // ===================== 一言：切走停、切回重计 1 分钟 =====================

    private void RestartQuoteTimer()
    {
        _quoteTimer.Stop();
        _quoteTimer.Interval = TimeSpan.FromMinutes(1);
        _quoteTimer.IsRepeating = true;
        _quoteTimer.Start();
    }

    // ===================== 倒计时目标管理 =====================

    private bool _suppressTargetChange;

    /// <summary>把「春节」和用户保存的自定义目标都塞进下拉框。</summary>
    private void RefreshTargetPicker()
    {
        _suppressTargetChange = true;
        TargetPicker.Items.Clear();

        var spring = AppSettings.SpringTarget;
        TargetPicker.Items.Add(spring);

        foreach (var target in Settings.Targets.Where(t => !t.IsSpringFestival))
        {
            TargetPicker.Items.Add(target);
        }

        // 选中当前生效的那个
        var current = CurrentTarget;
        var index = TargetPicker.Items
            .Select((item, i) => (item, i))
            .Where(pair => pair.item is CountdownTarget t && t.Id == current.Id)
            .Select(pair => pair.i)
            .DefaultIfEmpty(0)
            .First();
        TargetPicker.SelectedIndex = index;

        // 春节目标不能删
        DeleteTargetButton.IsEnabled = current is { IsSpringFestival: false };
        _suppressTargetChange = false;
    }

    private void TargetPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressTargetChange) return;
        if (TargetPicker.SelectedItem is not CountdownTarget target) return;

        Settings.ActiveTargetId = target.IsSpringFestival ? string.Empty : target.Id;
        Settings.Save();
        DeleteTargetButton.IsEnabled = !target.IsSpringFestival;
        UpdateCountdown();
    }

    /// <summary>新建一个自定义目标（名字 + 日期时间）。</summary>
    private async void AddTarget_Click(object sender, RoutedEventArgs e)
    {
        var nameBox = new TextBox { PlaceholderText = "给它起个名字，比如「期末考试」", Margin = new Thickness(0, 0, 0, 8) };
        var datePicker = new CalendarDatePicker
        {
            Date = DateTimeOffset.Now.AddDays(30),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            Margin = new Thickness(0, 0, 0, 8),
        };
        var hourBox = new NumberBox { Value = 0, Minimum = 0, Maximum = 23, Header = "时", SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
        var minuteBox = new NumberBox { Value = 0, Minimum = 0, Maximum = 59, Header = "分", SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
        var timeRow = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        timeRow.Children.Add(hourBox);
        timeRow.Children.Add(minuteBox);

        var panel = new StackPanel { Spacing = 4 };
        panel.Children.Add(nameBox);
        panel.Children.Add(datePicker);
        panel.Children.Add(timeRow);

        var dialog = new ContentDialog
        {
            Title = "新建倒计时目标",
            Content = panel,
            PrimaryButtonText = "保存",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = XamlRoot,
        };

        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        var name = (nameBox.Text ?? string.Empty).Trim();
        var date = datePicker.Date ?? DateTimeOffset.Now.AddDays(30);
        var when = new DateTime(date.Year, date.Month, date.Day,
            (int)hourBox.Value, (int)minuteBox.Value, 0);

        if (when <= DateTime.Now)
        {
            HostApp.MainWindowInstance!.ShowToast("这个时间已经过去了，换一个吧", error: true);
            return;
        }

        if (name.Length == 0) name = when.ToString("M月d日");

        var target = new CountdownTarget
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = name,
            Date = when.ToString("yyyy-MM-dd HH:mm:ss"),
            IsSpringFestival = false,
        };
        Settings.Targets.Add(target);
        Settings.ActiveTargetId = target.Id;
        Settings.Save();
        RefreshTargetPicker();
        UpdateCountdown();
    }

    /// <summary>删除当前自定义目标。</summary>
    private async void DeleteTarget_Click(object sender, RoutedEventArgs e)
    {
        if (TargetPicker.SelectedItem is not CountdownTarget target || target.IsSpringFestival) return;

        var dialog = new ContentDialog
        {
            Title = "删除这个目标？",
            Content = $"「{target.Name}」会被移除，倒计时改回自动跟随春节。",
            PrimaryButtonText = "删除",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        Settings.Targets.RemoveAll(t => t.Id == target.Id);
        if (Settings.ActiveTargetId == target.Id) Settings.ActiveTargetId = string.Empty;
        Settings.Save();
        RefreshTargetPicker();
        UpdateCountdown();
    }

    /// <summary>
    /// 按窗口宽度调整：宽窗口 4 格一行，窄窗口 2×2 排布，保证任何宽度都不裁切。
    /// </summary>
    private void RescaleDaysText()
    {
        if (HoursTile is null) return;

        double width = XamlRoot?.Size.Width ?? 1280;
        bool narrow = width < 1000;

        double size = width switch
        {
            < 820 => 52,
            < 900 => 62,
            < 1000 => 70,
            < 1120 => 78,
            _ => 84,
        };
        DaysText.FontSize = size;
        DaysText.LineHeight = size * 1.1;

        var tiles = new[] { HoursTile, MinutesTile, SecondsTile, MillisTile };

        // 窄窗口：2×2；宽窗口：4 格一行
        TimeBlocks.ColumnDefinitions.Clear();
        for (int c = 0; c < (narrow ? 2 : 4); c++)
        {
            TimeBlocks.ColumnDefinitions.Add(new ColumnDefinition
            {
                Width = new GridLength(1, GridUnitType.Star),
            });
        }

        for (int i = 0; i < tiles.Length; i++)
        {
            Grid.SetRow(tiles[i], narrow ? i / 2 : 0);
            Grid.SetColumn(tiles[i], narrow ? i % 2 : i);
        }

        double tilePad = narrow ? 4 : 14;
        double tileMinWidth = narrow ? 0 : 92;
        double numSize = narrow ? 26 : 30;
        double numMinWidth = narrow ? 40 : 52;
        double msMinWidth = narrow ? 50 : 64;

        foreach (var tile in tiles)
        {
            tile.Padding = new Thickness(tilePad, 8, tilePad, 8);
            tile.MinWidth = tileMinWidth;
        }

        foreach (var num in new[] { HoursText, MinutesText, SecondsText })
        {
            num.FontSize = numSize;
            num.MinWidth = numMinWidth;
        }

        MillisText.FontSize = numSize;
        MillisText.MinWidth = msMinWidth;

        foreach (var caption in new[] { HoursCaption, MinutesCaption, SecondsCaption, MillisCaption })
        {
            caption.FontSize = narrow ? 11 : 12;
        }
    }

    private async Task LoadQuoteAsync()
    {
        var (text, from, online) = await OnlineContent.FetchHitokotoAsync(onlineEnabled: Settings.QuoteEnabled);

        if (!online)
        {
            // 不做离线兜底：明确告诉用户连不上
            QuoteText.Text = Settings.QuoteEnabled
                ? "连接一言服务器失败"
                : "一言已关闭";
            QuoteText.Opacity = 0.55;
            QuoteFrom.Text = string.Empty;
            return;
        }

        QuoteFrom.Text = from.Length > 0 ? $"『{from}』" : string.Empty;

        // 内容为空时不要留着「正在加载」或上一次的文字
        if (string.IsNullOrEmpty(text))
        {
            QuoteText.Text = "连接一言服务器失败";
            QuoteText.Opacity = 0.55;
            return;
        }

        await PlayQuoteTypingAsync(text);
    }

    /// <summary>
    /// 一言打字机特效：逐字显示，和网页版观感一致。
    /// </summary>
    private async Task PlayQuoteTypingAsync(string text)
    {
        QuoteText.Opacity = 1.0;
        QuoteText.Text = string.Empty;

        // 每字间隔：短句慢一点看得清，长句快一点不拖沓
        int delay = text.Length > 60 ? 25 : (text.Length > 30 ? 35 : 50);

        var sb = new System.Text.StringBuilder(text.Length);
        foreach (var ch in text)
        {
            // 页面被移除就停止（但不依赖 IsLoaded，Frame 切换时它可能提前变 false）
            if (XamlRoot is null) return;

            sb.Append(ch);
            QuoteText.Text = sb.ToString();

            // 标点稍作停顿，读起来更自然
            int extra = ch is '，' or '、' or '；' ? 4 : (ch is '。' or '！' or '？' ? 7 : 0);

            await Task.Delay(delay + extra * 10);
        }
    }

    /// <summary>统一的「时间来源」文案，全部标明北京时间。</summary>
    private void UpdateTimeSourceText()
    {
        TimeSourceText.Text = NetworkTime.Synced
            ? NetworkTime.Source          // 显示实际用的时间源（高精度 / HTTP Date）
            : "本机时间";
    }

    /// <summary>只刷新时间来源显示（关于页切换「网络时间」开关时调用）。</summary>
    public void RefreshTimeSource()
    {
        UpdateTimeSourceText();
        UpdateCountdown();
    }

    // ===================== 一言颜色动态渐变 =====================

    private DispatcherQueueTimer? _gradientTimer;

    /// <summary>色相进度（0~1），每帧缓慢前进，产生平滑的彩虹流动。</summary>
    private double _hueProgress;

    /// <summary>启动渐变循环（页面加载时调用一次）。</summary>
    private void StartGradientAnimation()
    {
        if (_gradientTimer != null) return;

        _gradientTimer = DispatcherQueue.CreateTimer();
        // 150ms 一步，色相流动更明显但依然平滑（不会跳色）
        _gradientTimer.Interval = TimeSpan.FromMilliseconds(150);
        _gradientTimer.IsRepeating = true;
        _gradientTimer.Tick += (_, _) => StepGradient();
        _gradientTimer.Start();
    }

    /// <summary>
    /// 每 150 毫秒沿色环倒退 0.012（约 12 秒走完一圈），
    /// 六个色标按 1/6 间隔取色，形成首尾相接的彩虹带。
    /// 色相递减 → 色标整体向右平移，视觉上颜色从左往右流动。
    /// </summary>
    private void StepGradient()
    {
        if (XamlRoot is null) return;

        _hueProgress -= 0.012;
        if (_hueProgress < 0) _hueProgress += 1.0;

        QuoteStop1.Color = HueToColor(_hueProgress);
        QuoteStop2.Color = HueToColor(_hueProgress + 1.0 / 6);
        QuoteStop3.Color = HueToColor(_hueProgress + 2.0 / 6);
        QuoteStop4.Color = HueToColor(_hueProgress + 3.0 / 6);
        QuoteStop5.Color = HueToColor(_hueProgress + 4.0 / 6);
        QuoteStop6.Color = HueToColor(_hueProgress + 5.0 / 6);
    }

    /// <summary>把 0~1 的色相转成柔和的彩色（饱和度 65%、亮度 68%），避免过艳刺眼。</summary>
    private static Color HueToColor(double hue)
    {
        hue -= Math.Floor(hue);
        const double s = 0.65;
        const double v = 0.72;

        int i = (int)(hue * 6) % 6;
        double f = hue * 6 - Math.Floor(hue * 6);
        double p = v * (1 - s);
        double q = v * (1 - f * s);
        double t = v * (1 - (1 - f) * s);

        double r, g, b;
        switch (i)
        {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            default: r = v; g = p; b = q; break;
        }

        return Color.FromArgb(255, (byte)(r * 255), (byte)(g * 255), (byte)(b * 255));
    }

    private void StopGradientAnimation()
    {
        _gradientTimer?.Stop();
        _gradientTimer = null;
    }

    /// <summary>联网开关变化后立即重新拉取（关于页调用）。</summary>
    public async Task ReloadQuoteAsync()
    {
        _quoteTimer.Stop();
        await LoadQuoteAsync();
        RestartQuoteTimer();
    }

    /// <summary>复制当前一言（句子 + 出处）到剪贴板。</summary>
    private void CopyQuote_Click(object sender, RoutedEventArgs e)
    {
        var text = QuoteText.Text;
        if (string.IsNullOrWhiteSpace(text)
            || text == "正在加载……"
            || text == "连接一言服务器失败"
            || text == "一言已关闭")
        {
            HostApp.MainWindowInstance!.ShowToast("现在没有可复制的内容");
            return;
        }

        var from = QuoteFrom.Text;
        var content = from.Length > 0 ? $"{text} {from}" : text;

        try
        {
            var package = new DataPackage();
            package.SetText(content);
            Clipboard.SetContent(package);
            Clipboard.Flush();   // 关掉程序后剪贴板内容还在

            HostApp.MainWindowInstance!.ShowToast("已复制到剪贴板");
        }
        catch (Exception ex)
        {
            HostApp.MainWindowInstance!.ShowToast("复制失败：" + ex.Message, error: true);
        }
    }
}
