using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>祈愿页：UP 展示、祈愿按钮、保底进度、最近中奖。</summary>
public sealed partial class WishPage : Page
{
    private bool _isRolling;

    public WishPage()
    {
        InitializeComponent();
        Loaded += (_, _) =>
        {
            AdaptLayout();
            RefreshAll();
        };
        SizeChanged += (_, _) =>
        {
            AdaptLayout();
            RefreshUP();
        };
    }

    /// <summary>
    /// 窄窗口下把「祈愿按钮 + 结果卡片」从左右并排改成上下排列，
    /// 并把按钮宽度收窄，避免内容被裁。
    /// </summary>
    private void AdaptLayout()
    {
        if (LotteryRow is null) return;

        double width = XamlRoot?.Size.Width ?? 1280;
        bool narrow = width < 1000;

        if (narrow)
        {
            // 上下排列：按钮在上，结果卡片在下并撑满
            LotteryButton.Width = double.NaN;          // 由列宽决定
            LotteryButton.HorizontalAlignment = HorizontalAlignment.Stretch;
            LotteryButton.MinWidth = 0;
            Grid.SetRow(LotteryButton, 0);
            Grid.SetColumn(LotteryButton, 0);
            Grid.SetColumnSpan(LotteryButton, 2);

            Grid.SetRow(ResultCard, 1);
            Grid.SetColumn(ResultCard, 0);
            Grid.SetColumnSpan(ResultCard, 2);
        }
        else
        {
            LotteryButton.Width = 200;
            LotteryButton.HorizontalAlignment = HorizontalAlignment.Left;
            LotteryButton.MinWidth = 140;
            Grid.SetRow(LotteryButton, 0);
            Grid.SetColumn(LotteryButton, 0);
            Grid.SetColumnSpan(LotteryButton, 1);

            Grid.SetRow(ResultCard, 0);
            Grid.SetColumn(ResultCard, 1);
            Grid.SetColumnSpan(ResultCard, 1);
        }
    }

    private MainWindow Host => (MainWindow)App.Instance.MainWindowInstance!;

    private GachaEngine Engine => Host.Engine;

    private void RefreshAll()
    {
        RefreshUP();
        RefreshStatus();
        RefreshWinners();
    }

    // ===================== 数据渲染 =====================

    private void RefreshUP()
    {
        var pool = Engine.Pool;
        FillUpGrid(UpFiveRow, "五星 UP", 0, pool.FiveStarUP is { } f ? [f] : [], 18, 220);
        FillUpGrid(UpFourRow, "四星 UP", 1, pool.FourStarUPs.ToList(), 16, 190);
    }

    /// <summary>
    /// 往一个 Grid 里填「标签 + 若干名字」，按可用宽度自动换行。
    /// 第一列固定放标签，后面的名字格子按宽度算每行能放几个。
    /// </summary>
    private void FillUpGrid(Grid grid, string label, int rarity, List<Character> items, double fontSize, double maxNameWidth)
    {
        grid.Children.Clear();
        grid.ColumnDefinitions.Clear();
        grid.RowDefinitions.Clear();

        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });                      // 标签列
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); // 名字列
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        var labelBlock = new TextBlock
        {
            Text = label,
            FontFamily = UiFactory.Font("UiBlackFont"),
            FontWeight = Microsoft.UI.Text.FontWeights.Black,
            FontSize = 15,
            Foreground = ColorHelper.Brush(Palette.RarityColor(rarity)),
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 10, 0),
        };
        Grid.SetRow(labelBlock, 0);
        Grid.SetColumn(labelBlock, 0);
        grid.Children.Add(labelBlock);

        // 名字区（标签右边那格）：里面再按宽度分行
        var namesHost = new StackPanel { Orientation = Orientation.Vertical, Spacing = 4 };

        if (items.Count == 0)
        {
            namesHost.Children.Add(new TextBlock
            {
                Text = "名单为空，去「名单」页添加名字",
                FontSize = 14,
                Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
                VerticalAlignment = VerticalAlignment.Center,
            });
        }
        else
        {
            // 两个名字之间的竖线占宽（含左右边距）
            const double separatorWidth = 22;
            // 图标 + chip 内间距
            const double chipPadding = 26;

            // 先测量所有名字的真实宽度，才能准确分行
            var widths = new List<double>(items.Count);
            double totalWidth = 0;
            foreach (var character in items)
            {
                var measureText = new TextBlock
                {
                    Text = character.Name,
                    FontFamily = UiFactory.Font("UiRegularFont"),
                    FontSize = fontSize,
                    TextWrapping = TextWrapping.NoWrap,
                    MaxWidth = maxNameWidth,
                    TextTrimming = TextTrimming.CharacterEllipsis,
                };
                measureText.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
                double w = Math.Min(measureText.DesiredSize.Width, maxNameWidth) + chipPadding;
                widths.Add(w);
                totalWidth += w;
            }

            double available = (grid.ActualWidth > 0 ? grid.ActualWidth : 700) - 80;

            int index = 0;
            while (index < items.Count)
            {
                var line = new StackPanel
                {
                    Orientation = Orientation.Horizontal,
                    VerticalAlignment = VerticalAlignment.Center,
                };

                // 逐步往这一行里加，直到放不下为止
                double used = 0;
                int start = index;
                while (index < items.Count)
                {
                    double need = widths[index] + (index > start ? separatorWidth : 0);
                    if (index > start && used + need > available) break;

                    if (index > start)
                    {
                        line.Children.Add(new TextBlock
                        {
                            Text = "|",
                            FontSize = fontSize + 1,
                            Foreground = (Brush)Application.Current.Resources["TextFillColorTertiaryBrush"],
                            VerticalAlignment = VerticalAlignment.Center,
                            Margin = new Thickness(6, 0, 6, 0),
                        });
                    }

                    line.Children.Add(UiFactory.CharacterChip(
                        items[index], fontSize: fontSize, maxNameWidth: maxNameWidth));

                    used += need;
                    index++;
                }

                namesHost.Children.Add(line);
            }
        }

        Grid.SetRow(namesHost, 0);
        Grid.SetColumn(namesHost, 1);
        grid.Children.Add(namesHost);
    }

    private void RefreshStatus()
    {
        var week = Engine.Week;
        LotterySubText.Text = $"（累计 {week.TotalDraws} 次）";

        int fiveTarget = Math.Min(week.FiveStarPity, 90);
        int fourTarget = Math.Min(week.FourStarPity, 10);

        // 先归零，下一帧再设成目标值，让 ProgressBar 播放从 0 增长到目标的动画
        FiveStarProgress.Value = 0;
        FourStarProgress.Value = 0;

        DispatcherQueue.TryEnqueue(() =>
        {
            FiveStarProgress.Value = fiveTarget;
            FourStarProgress.Value = fourTarget;
        });

        FivePityText.Text = $"{week.FiveStarPity} / 90";
        FourPityText.Text = $"{week.FourStarPity} / 10";

        var summary = $"捕获明光计数 {week.CaptureLightCounter}/3";
        if (week.IsGuaranteed5StarUP) summary += " · 五星必中 UP";
        if (week.IsGuaranteed4StarUP) summary += " · 四星必中 UP";
        if (week.IsCaptureLightGuaranteed) summary += " · 捕获明光已激活";
        PitySummary.Text = summary;
    }

    /// <summary>最近中奖最多显示几条。</summary>
    private const int RecentWinnerCount = 10;

    private double _lastWinnersWidth;

    private void LastWinnersPanel_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        // 宽度变化超过阈值才重排，避免抖动
        if (Math.Abs(e.NewSize.Width - _lastWinnersWidth) < 20) return;
        _lastWinnersWidth = e.NewSize.Width;
        RefreshWinners();
    }

    private void RefreshWinners()
    {
        LastWinnersPanel.Children.Clear();
        LastWinnersPanel.ColumnDefinitions.Clear();
        LastWinnersPanel.RowDefinitions.Clear();

        var recent = Engine.Week.History.Take(RecentWinnerCount).ToList();
        if (recent.Count == 0)
        {
            var empty = new TextBlock
            {
                Text = "还没有抽卡记录，点上面的「祈愿」开始吧。",
                FontFamily = UiFactory.Font("UiRegularFont"),
                FontSize = 13,
                Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
            };
            Grid.SetRow(empty, 0);
            Grid.SetColumn(empty, 0);
            LastWinnersPanel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            LastWinnersPanel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            LastWinnersPanel.Children.Add(empty);
            return;
        }

        // 按实际可用宽度算每行能放几个，放满自动换行
        double available = LastWinnersPanel.ActualWidth > 0 ? LastWinnersPanel.ActualWidth : 900;
        const double cellWidth = 150;
        int columns = Math.Max(1, (int)(available / cellWidth));

        for (int c = 0; c < columns; c++)
        {
            LastWinnersPanel.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        }

        int index = 0;
        foreach (var record in recent)
        {
            int row = index / columns;
            int col = index % columns;
            if (LastWinnersPanel.RowDefinitions.Count <= row)
            {
                LastWinnersPanel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            }

            var chip = new Border
            {
                Background = (Brush)Application.Current.Resources["SubtleFillColorSecondaryBrush"],
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(10, 4, 10, 4),
                HorizontalAlignment = HorizontalAlignment.Stretch,
                Child = new TextBlock
                {
                    Text = $"{record.Name} {record.RarityLabel}",
                    FontFamily = UiFactory.Font("UiRegularFont"),
                    FontSize = 13,
                    TextWrapping = TextWrapping.NoWrap,
                    TextTrimming = TextTrimming.CharacterEllipsis,
                    Foreground = ColorHelper.Brush(Palette.RarityDimColor(record.Rarity)),
                },
            };
            Grid.SetRow(chip, row);
            Grid.SetColumn(chip, col);
            // 名字可能被截断，悬停看全名
            ToolTipService.SetToolTip(chip, new ToolTip
            {
                Content = $"{record.Name} {record.RarityLabel}",
                Placement = Microsoft.UI.Xaml.Controls.Primitives.PlacementMode.Top,
            });
            LastWinnersPanel.Children.Add(chip);
            index++;
        }
    }

    // ===================== 祈愿交互 =====================

    /// <summary>单抽入口：点「祈愿」按钮抽一次。</summary>
    private void LotteryButton_Click(object sender, RoutedEventArgs e) => TriggerDraw(1);

    /// <summary>十连入口：点「十连」按钮抽十次。</summary>
    private void TenPullButton_Click(object sender, RoutedEventArgs e) => TriggerDraw(10);

    /// <summary>抽卡（按钮与快捷键共用）。count：1 单抽，10 十连。</summary>
    public void TriggerDraw(int count)
    {
        if (_isRolling) return;

        // 名单为空时不能抽，引导用户先去导入名字
        if (Engine.Pool.Count == 0)
        {
            Host.ShowToast("还没有名单，先去「名单」页添加名字吧", error: true);
            Host.NavigateTo("roster");
            return;
        }

        _isRolling = true;
        Engine.RefreshWeek();
        var results = new List<DrawResult>(count);
        for (int i = 0; i < count; i++) results.Add(Engine.DrawOne());
        RefreshStatus();

        if (count == 1)
        {
            ShowResultCard(results[0], isTenPull: false, index: 0, total: 1);
            return;
        }

        LotterySubText.Text = "十连中…";
        ShowTenPullSequence(results, 0);
    }

    private void ShowTenPullSequence(List<DrawResult> results, int index)
    {
        ShowResultCard(results[index], isTenPull: true, index: index, total: results.Count,
            onContinue: () =>
            {
                if (index < results.Count - 1)
                {
                    ShowTenPullSequence(results, index + 1);
                    return;
                }
                _isRolling = false;
                ResultCard.Visibility = Visibility.Collapsed;
                RefreshAll();
                Host.ShowToast($"十连完成：{results.Count(r => r.RarityIndex == 0)} 个五星 · {results.Count(r => r.RarityIndex == 1)} 个四星");
            });
    }

    /// <summary>
    /// 把抽卡结果画到祈愿按钮右边的小卡片里（不再全屏弹层）。
    /// </summary>
    private void ShowResultCard(DrawResult result, bool isTenPull, int index, int total, Action? onContinue = null)
    {
        var character = result.Winner;

        var (rarityText, rarityColor) = result.RarityIndex switch
        {
            0 => ("五星", ColorHelper.Brush("#FFD700")),
            1 => ("四星", ColorHelper.Brush("#9B6DE8")),
            _ => ("三星", ColorHelper.Brush("#4FC3F7")),
        };

        ResultCard.BorderBrush = rarityColor;
        ResultCard.BorderThickness = new Thickness(2);

        // 捕获明光标记
        ResultCaptureBadge.Visibility = result.TriggeredCaptureLight ? Visibility.Visible : Visibility.Collapsed;

        // 内容：元素图标 + 名字 + 星级 + UP 标记
        ResultNamePanel.Children.Clear();
        ResultNamePanel.ColumnDefinitions.Clear();
        ResultNamePanel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });   // 图标
        ResultNamePanel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); // 名字
        ResultNamePanel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });   // 星级

        var iconBlock = new TextBlock
        {
            Text = character.Element.Glyph.ToString(),
            FontFamily = (Microsoft.UI.Xaml.Media.FontFamily)Application.Current.Resources["SymbolFont"],
            FontSize = 20,
            Foreground = ColorHelper.Brush(character.Element.Color),
            VerticalAlignment = VerticalAlignment.Center,
        };
        Grid.SetColumn(iconBlock, 0);
        ResultNamePanel.Children.Add(iconBlock);

        var nameBlock = new TextBlock
        {
            Text = character.Name,
            FontFamily = (Microsoft.UI.Xaml.Media.FontFamily)Application.Current.Resources["UiBlackFont"],
            FontSize = 22,
            FontWeight = Microsoft.UI.Text.FontWeights.Black,
            Foreground = rarityColor,
            VerticalAlignment = VerticalAlignment.Center,
            // 名字太长时收尾省略，悬停看全名
            TextWrapping = TextWrapping.NoWrap,
            TextTrimming = TextTrimming.CharacterEllipsis,
            MaxLines = 1,
            MinWidth = 1,
        };
        ToolTipService.SetToolTip(nameBlock, character.Name);
        Grid.SetColumn(nameBlock, 1);
        ResultNamePanel.Children.Add(nameBlock);

        var rarityBlock = new TextBlock
        {
            Text = rarityText,
            FontFamily = (Microsoft.UI.Xaml.Media.FontFamily)Application.Current.Resources["UiRegularFont"],
            FontSize = 13,
            Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(4, 0, 0, 0),
        };
        Grid.SetColumn(rarityBlock, 2);
        ResultNamePanel.Children.Add(rarityBlock);

        if (result.IsUP)
        {
            // 第四列：UP 徽章
            ResultNamePanel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var upBadge = new Border
            {
                Background = character.Rarity == 0 ? ColorHelper.Brush("#FFD700") : ColorHelper.Brush("#9B6DE8"),
                CornerRadius = new CornerRadius(4),
                Padding = new Thickness(6, 1, 6, 1),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(2, 0, 0, 0),
                Child = new TextBlock
                {
                    Text = "UP",
                    FontSize = 11,
                    FontWeight = Microsoft.UI.Text.FontWeights.Black,
                    Foreground = new SolidColorBrush(Microsoft.UI.Colors.Black),
                },
            };
            Grid.SetColumn(upBadge, 3);
            ResultNamePanel.Children.Add(upBadge);
        }

        // 继续按钮文案
        ResultContinueButton.Content = isTenPull ? $"继续（{index + 1}/{total}）" : "继续";
        _resultOnContinue = onContinue ?? (() =>
        {
            _isRolling = false;
            ResultCard.Visibility = Visibility.Collapsed;
            RefreshAll();
        });

        ResultCard.Visibility = Visibility.Visible;
        ResultCard.FadeIn();
    }

    private Action? _resultOnContinue;

    private void ResultContinueButton_Click(object sender, RoutedEventArgs e)
    {
        var action = _resultOnContinue;
        _resultOnContinue = null;
        action?.Invoke();
    }

    // ===================== 顶部按钮 =====================

    private void WhoIsUp_Click(object sender, RoutedEventArgs e) => Host.NavigateTo("roster");

    private async void OpenHelp_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new ContentDialog
        {
            Title = "祈愿规则",
            XamlRoot = XamlRoot,
            CloseButtonText = "知道了",
            DefaultButton = ContentDialogButton.Close,
            Content = new ScrollViewer
            {
                MaxHeight = 440,
                Content = new TextBlock
                {
                    TextWrapping = TextWrapping.Wrap,
                    LineHeight = 24,
                    Text = "【一、星级与概率】\n"
                         + "五星 0.6%，四星 5.1%，三星 94.3%。\n\n"
                         + "【二、五星保底】\n"
                         + "前 73 抽固定 0.6%；第 74 抽起每抽 +6%，即 74 抽 6.6%、75 抽 12.6%……"
                         + "第 90 抽必定出五星。抽到五星后计数归零。\n\n"
                         + "【三、四星保底】\n"
                         + "连续 9 抽没有四星时，第 10 抽必定出四星。"
                         + "出五星会同时把五星和四星保底计数一起归零。\n\n"
                         + "【四、角色池】\n"
                         + "名单按 五星 : 四星 : 三星 ≈ 1 : 8 : 53 的比例划分，"
                         + "五星至少 1 人、四星至少 3 人。名单至少需要 10 个名字。\n"
                         + "点「重新洗牌」会重新分配星级并重抽本期 UP。\n\n"
                         + "【五、UP 与大小保底】\n"
                         + "每次洗牌随机抽 1 名五星 UP、最多 3 名四星 UP。\n"
                         + "出五星或四星时按 50% 判定是否为当期 UP；"
                         + "出了非 UP 会记为「大保底」，下一次该星级必出 UP。\n\n"
                         + "【六、捕获明光】\n"
                         + "五星连续交替命中 UP / 非 UP 累计 3 次后进入「明光状态」，"
                         + "下一次五星必定是本期 UP；触发后计数清零。\n\n"
                         + "【七、每周重置】\n"
                         + "抽卡记录与保底状态按 ISO 周隔离，每周一 00:00 自动开始新的一周。"
                         + "「历史记录」页只显示当周数据，导出也只包含当周。\n\n"
                         + "【八、十连】\n"
                         + "点「祈愿」抽一次，点「十连」连抽十次。"
                         + "十连里的每一抽都各自独立判定，保底计数逐抽累加。",
                },
            },
        };
        await dialog.ShowAsync();
    }
}
