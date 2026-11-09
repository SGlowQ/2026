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

/// <summary>名单页：编辑、导入导出、角色池查看、重新洗牌。</summary>
public sealed partial class RosterPage : Page
{
    public RosterPage()
    {
        InitializeComponent();
        Loaded += (_, _) => Refresh();
        // 窗口宽度变了就重新按新宽度分行
        SizeChanged += (_, _) =>
        {
            if (_lastWidth == 0 || Math.Abs(_lastWidth - ActualWidth) > 40)
            {
                _lastWidth = ActualWidth;
                BuildPool();
            }
        };
    }

    private double _lastWidth;

    private MainWindow Host => (MainWindow)App.Instance.MainWindowInstance!;

    private App HostApp => App.Instance;

    /// <summary>刷新分组下拉框。</summary>
    private void RefreshGroups()
    {
        var settings = HostApp.Settings;
        var groups = settings.RosterGroups;

        _suppressGroupChange = true;
        GroupPicker.Items.Clear();
        int selected = 0;
        for (int i = 0; i < groups.Count; i++)
        {
            var g = groups[i];
            GroupPicker.Items.Add(new ComboBoxItem
            {
                Content = $"{g.Name}（{g.Names.Count} 人）",
                Tag = g.Id,
            });
            if (g.Id == settings.ActiveGroupId) selected = i;
        }
        GroupPicker.SelectedIndex = selected;
        _suppressGroupChange = false;
    }

    private bool _suppressGroupChange;

    private void GroupPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressGroupChange) return;
        if (GroupPicker.SelectedItem is not ComboBoxItem item || item.Tag is not string id) return;

        var settings = HostApp.Settings;
        if (settings.ActiveGroupId == id) return;

        settings.ActiveGroupId = id;
        settings.Save();

        var names = settings.ActiveNames;
        HostApp.Engine.AttachPool(CharacterPool.Build(names));

        Refresh();
        Host.ShowToast($"已切换到「{settings.ActiveGroup?.Name}」，{names.Count} 人");
    }

    private async void NewGroup_Click(object sender, RoutedEventArgs e)
    {
        var input = new TextBox { PlaceholderText = "比如：1班、2班" };
        var dialog = new ContentDialog
        {
            Title = "新建名单分组",
            Content = input,
            PrimaryButtonText = "创建",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        var name = input.Text?.Trim();
        if (string.IsNullOrEmpty(name)) name = "新名单";

        var settings = HostApp.Settings;
        var group = RosterGroup.Create(name, []);
        settings.RosterGroups.Add(group);
        settings.ActiveGroupId = group.Id;
        settings.Save();

        RefreshGroups();
        Refresh();
        Host.ShowToast($"已创建「{name}」");
    }

    private async void RenameGroup_Click(object sender, RoutedEventArgs e)
    {
        var settings = HostApp.Settings;
        var group = settings.ActiveGroup;
        if (group == null) return;

        var input = new TextBox { Text = group.Name };
        var dialog = new ContentDialog
        {
            Title = "重命名分组",
            Content = input,
            PrimaryButtonText = "保存",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        var name = input.Text?.Trim();
        if (string.IsNullOrEmpty(name)) return;

        group.Name = name;
        settings.Save();
        RefreshGroups();
        Host.ShowToast($"已重命名为「{name}」");
    }

    private async void DeleteGroup_Click(object sender, RoutedEventArgs e)
    {
        var settings = HostApp.Settings;
        var group = settings.ActiveGroup;
        if (group == null) return;

        if (settings.RosterGroups.Count <= 1)
        {
            Host.ShowToast("至少要保留一个分组", error: true);
            return;
        }

        var dialog = new ContentDialog
        {
            Title = "删除这个分组？",
            Content = new TextBlock
            {
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 22,
                Text = $"「{group.Name}」里的 {group.Names.Count} 个名字会被删除。\n\n此操作无法撤销。",
            },
            PrimaryButtonText = "删除",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        settings.RosterGroups.Remove(group);
        settings.ActiveGroupId = settings.RosterGroups[0].Id;
        settings.Save();

        HostApp.Engine.AttachPool(CharacterPool.Build(settings.ActiveNames));

        RefreshGroups();
        Refresh();
        Host.ShowToast("分组已删除");
    }

    private void Refresh()
    {
        RefreshGroups();
        var custom = HostApp.Settings.ActiveNames;
        NamesBox.Text = custom.Count > 0 ? string.Join(Environment.NewLine, custom) : string.Empty;
        NameCountText.Text = custom.Count > 0 ? $"当前 {custom.Count} 人" : "还没有名单，先粘贴名字吧";
        BuildPool();
    }

    private void BuildPool()
    {
        PoolPanel.Children.Clear();
        var pool = HostApp.Engine.Pool;

        // 可用宽度决定每行放几个；卡片最小宽 108，加间距约 116
        double available = Math.Max(400, PoolPanel.ActualWidth > 0 ? PoolPanel.ActualWidth : 900) - 16;
        _poolColumns = Math.Max(1, (int)(available / 116));

        for (int rarity = 0; rarity < 3; rarity++)
        {
            var group = pool[rarity];
            var section = new StackPanel { Spacing = 8 };

            var header = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            header.Children.Add(new TextBlock
            {
                Text = rarity switch { 0 => "五星", 1 => "四星", _ => "三星" },
                FontFamily = UiFactory.Font("UiBlackFont"),
                FontWeight = Microsoft.UI.Text.FontWeights.Black,
                FontSize = 15,
                Foreground = ColorHelper.Brush(Palette.RarityColor(rarity)),
            });
            header.Children.Add(new TextBlock
            {
                Text = $"{group.Count} 人",
                FontFamily = UiFactory.Font("UiRegularFont"),
                FontSize = 13,
                Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
                VerticalAlignment = VerticalAlignment.Center,
            });
            section.Children.Add(header);

            // UP 排前面，其余保持原顺序
            var ordered = group.OrderByDescending(pool.IsUP).ToList();
            section.Children.Add(BuildPoolList(ordered, pool));
            PoolPanel.Children.Add(section);
        }
    }

    /// <summary>当前列数（按宽度算出来）。</summary>
    private int _poolColumns = 6;

    /// <summary>
    /// 用 ItemsRepeater + UniformGridLayout 构建角色卡片列表。
    /// 只创建可见范围内的卡片，几百上千个名字也不会一次建出几千个控件，
    /// 滚动时按需生成，所以打开名单页不再卡。
    /// </summary>
    private FrameworkElement BuildPoolList(List<Character> ordered, CharacterPool pool)
    {
        var layout = new UniformGridLayout
        {
            // 固定卡片宽度，名字再长也不会把卡片撑出去（超出部分收尾省略，悬停看全名）
            MinItemWidth = 108,
            MinItemHeight = 40,
            MinRowSpacing = 8,
            MinColumnSpacing = 8,
            ItemsStretch = UniformGridLayoutItemsStretch.Fill,
            ItemsJustification = UniformGridLayoutItemsJustification.Start,
            Orientation = Orientation.Horizontal,
            MaximumRowsOrColumns = _poolColumns,
        };

        var repeater = new ItemsRepeater
        {
            Layout = layout,
            ItemsSource = ordered,
            HorizontalAlignment = HorizontalAlignment.Stretch,
            ItemTemplate = (DataTemplate)Resources["CharacterChipTemplate"],
        };

        // 卡片按需生成：ElementPrepared 只在某个卡片进入可视区域时触发
        repeater.ElementPrepared += (_, args) =>
        {
            if (args.Element is not Border chip) return;
            // ItemsRepeater 的 DataContext 在 ElementPrepared 阶段可能还没同步，
            // 用索引取数据更可靠
            int index = args.Index;
            if (index < 0 || index >= ordered.Count) return;

            var character = ordered[index];
            bool isUp = pool.IsUP(character);

            // 只换背景，不动模板里已生成的子元素
            chip.Background = isUp
                ? ColorHelper.Brush(character.Rarity == 0 ? "#FFD700" : "#9B6DE8")
                : (Brush)Application.Current.Resources["SubtleFillColorSecondaryBrush"];

            if (chip.Child is Grid panel && panel.Children.Count >= 2)
            {
                if (panel.Children[0] is FontIcon icon)
                {
                    icon.Glyph = character.Element.Glyph;
                    icon.Foreground = isUp
                        ? ColorHelper.Brush("#1a1a1a")
                        : ColorHelper.Brush(Palette.RarityDimColor(character.Rarity));
                }
                if (panel.Children[1] is TextBlock nameText)
                {
                    nameText.Text = character.Name;
                    // 超长时鼠标悬停看全名
                    ToolTipService.SetToolTip(nameText, character.Name);
                    nameText.Foreground = isUp
                        ? ColorHelper.Brush("#1a1a1a")
                        : ColorHelper.Brush(Palette.RarityDimColor(character.Rarity));
                }
            }
        };

        // 让它在主 ScrollViewer 里正常参与布局，不自己滚动
        ScrollViewer.SetVerticalScrollMode(repeater, ScrollMode.Disabled);
        ScrollViewer.SetVerticalScrollBarVisibility(repeater, ScrollBarVisibility.Disabled);

        return repeater;
    }

    /// <summary>
    /// 把文本框/文件内容拆成名字列表。
    /// 必须同时兼容 \r\n、\n、\r —— WinUI 的 TextBox 换行用的是 \r，
    /// 只按 \n 拆会把整段文字当成一个名字，导致「至少需要 10 个名字」永远不通过。
    /// 顺带去掉空行和重复项（保留首次出现的顺序）。
    /// </summary>
    private static List<string> ParseNames(string text) => (text ?? string.Empty)
        .Replace("\r\n", "\n")
        .Replace("\r", "\n")
        .Split('\n')
        .Select(l => l.Trim())
        .Where(l => l.Length > 0)
        .Distinct()
        .ToList();

    /// <summary>统计原始行数（含空行和重复），用来给用户提示。</summary>
    private static (int Total, int Blank, int Duplicate) AnalyzeNames(string text)
    {
        var lines = (text ?? string.Empty)
            .Replace("\r\n", "\n")
            .Replace("\r", "\n")
            .Split('\n')
            .Select(l => l.Trim())
            .ToList();

        int total = lines.Count;
        int blank = lines.Count(l => l.Length == 0);
        var real = lines.Where(l => l.Length > 0).ToList();
        int duplicate = real.Count - real.Distinct().Count();

        return (total, blank, duplicate);
    }

    private void Apply_Click(object sender, RoutedEventArgs e)
    {
        var names = ParseNames(NamesBox.Text);
        var (total, blank, duplicate) = AnalyzeNames(NamesBox.Text);

        if (names.Count < 10)
        {
            Host.ShowToast($"名单至少需要 10 个名字，当前只有 {names.Count} 个。", error: true);
            return;
        }

        var grp = HostApp.Settings.ActiveGroup;
        if (grp != null) grp.Names = names;
        HostApp.Settings.Save();
        HostApp.Engine.AttachPool(CharacterPool.Build(names));

        // 编辑框也换成清洗后的名单，否则提示说去重了，框里还留着重复行
        if (duplicate > 0 || blank > 0)
        {
            NamesBox.Text = string.Join(Environment.NewLine, names);
        }

        NameCountText.Text = $"当前 {names.Count} 人";
        BuildPool();
        RefreshGroups();

        // 有被过滤掉的内容时告诉用户，别让人以为名单少了是 bug
        var notice = "";
        if (duplicate > 0) notice += $"，已自动去重 {duplicate} 个";
        if (blank > 0) notice += $"，已忽略 {blank} 个空行";

        Host.ShowToast($"已应用名单：共 {names.Count} 人{notice}");
    }

    /// <summary>名单工具：去空行 / 去重 / 排序。</summary>
    private void CleanNames_Click(object sender, RoutedEventArgs e)
    {
        var (_, blank, duplicate) = AnalyzeNames(NamesBox.Text);
        if (blank == 0 && duplicate == 0)
        {
            Host.ShowToast("名单很干净，没有多余的空行或重复项");
            return;
        }

        var names = ParseNames(NamesBox.Text);
        NamesBox.Text = string.Join(Environment.NewLine, names);
        NameCountText.Text = $"当前 {names.Count} 人";

        var msg = new List<string>();
        if (duplicate > 0) msg.Add($"去掉 {duplicate} 个重复");
        if (blank > 0) msg.Add($"去掉 {blank} 个空行");
        Host.ShowToast("已整理：" + string.Join("、", msg));
    }

    /// <summary>按名字排序。</summary>
    private void SortNames_Click(object sender, RoutedEventArgs e)
    {
        var names = ParseNames(NamesBox.Text);
        if (names.Count == 0)
        {
            Host.ShowToast("名单是空的");
            return;
        }

        var sorted = names.OrderBy(n => n, StringComparer.CurrentCulture).ToList();
        NamesBox.Text = string.Join(Environment.NewLine, sorted);
        NameCountText.Text = $"当前 {sorted.Count} 人";
        Host.ShowToast($"已按名字排序（{sorted.Count} 人）");
    }

    private async void Reset_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new ContentDialog
        {
            Title = "清空名单？",
            Content = "名单会被清空，角色池和本期 UP 也会一起重置。之后需要重新导入或粘贴名字才能抽卡。",
            PrimaryButtonText = "清空",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        var clearGrp = HostApp.Settings.ActiveGroup;
        if (clearGrp != null) clearGrp.Names = [];
        HostApp.Settings.Save();
        NamesBox.Text = string.Empty;
        NameCountText.Text = "还没有名单，先粘贴名字吧";
        HostApp.Engine.AttachPool(CharacterPool.Build([]));
        BuildPool();
        RefreshGroups();
        Host.ShowToast("名单已清空");
    }

    private void Reroll_Click(object sender, RoutedEventArgs e)
    {
        var names = HostApp.Settings.ActiveNames.Count > 0 ? HostApp.Settings.ActiveNames : HostApp.DefaultNames;
        if (names.Count == 0)
        {
            Host.ShowToast("名单还是空的，先在上面添加名字吧", error: true);
            return;
        }
        HostApp.Engine.AttachPool(CharacterPool.Build(names));
        BuildPool();
        Host.ShowToast("已重新洗牌，本期 UP 也已重新抽取");
    }

    private async void Import_Click(object sender, RoutedEventArgs e)
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".txt");
        InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));
        var file = await picker.PickSingleFileAsync();
        if (file == null) return;
        try
        {
            var text = await File.ReadAllTextAsync(file.Path);
            var names = ParseNames(text);
            if (names.Count < 10)
            {
                Host.ShowToast($"导入名单至少需要 10 个名字，当前只有 {names.Count} 个。", error: true);
                return;
            }

            // 文件名（去掉扩展名）当作分组名：已有同名分组就切过去并覆盖，
            // 没有就新建一个，这样导入「1班.txt」「2班.txt」等于自动分好组
            var fileName = Path.GetFileNameWithoutExtension(file.Path).Trim();
            var settings = HostApp.Settings;
            RosterGroup? target = null;
            bool created = false;

            if (fileName.Length > 0)
            {
                target = settings.RosterGroups.FirstOrDefault(
                    g => string.Equals(g.Name, fileName, StringComparison.CurrentCultureIgnoreCase));

                if (target == null)
                {
                    target = RosterGroup.Create(fileName, names);
                    settings.RosterGroups.Add(target);
                    created = true;
                }

                settings.ActiveGroupId = target.Id;
            }

            if (!created)
            {
                var grp = target ?? settings.ActiveGroup;
                if (grp != null) grp.Names = names;
            }

            settings.Save();
            HostApp.Engine.AttachPool(CharacterPool.Build(names));
            Refresh();

            var groupText = fileName.Length > 0
                ? (created ? $"已新建分组「{fileName}」" : $"已覆盖分组「{fileName}」")
                : "已导入当前分组";
            Host.ShowToast($"{groupText}，共 {names.Count} 个名字");
        }
        catch (Exception ex)
        {
            Host.ShowToast("读取失败：" + ex.Message, error: true);
        }
    }

    private async void ExportTxt_Click(object sender, RoutedEventArgs e)
    {
        var names = HostApp.Settings.ActiveNames.Count > 0 ? HostApp.Settings.ActiveNames : HostApp.DefaultNames;
        if (names.Count == 0)
        {
            Host.ShowToast("名单还是空的，没有可导出的名字", error: true);
            return;
        }

        // 用当前分组名当文件名，比如「1班.txt」「默认名单.txt」
        var groupName = HostApp.Settings.ActiveGroup?.Name;
        var picker = new FileSavePicker
        {
            SuggestedFileName = SanitizeFileName(
                string.IsNullOrWhiteSpace(groupName) ? "名单" : groupName),
        };
        picker.FileTypeChoices.Add("文本文件", new List<string> { ".txt" });
        InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));
        var file = await picker.PickSaveFileAsync();
        if (file == null) return;
        try
        {
            await File.WriteAllLinesAsync(file.Path, names);
            Host.ShowToast($"已导出 {names.Count} 个名字到「{Path.GetFileName(file.Path)}」");
        }
        catch (Exception ex)
        {
            Host.ShowToast("导出失败：" + ex.Message, error: true);
        }
    }

    /// <summary>去掉文件名里不能用的字符，避免保存对话框报错。</summary>
    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var chars = name.Select(c => invalid.Contains(c) ? '_' : c).ToArray();
        var clean = new string(chars).Trim();
        return clean.Length == 0 ? "名单" : clean;
    }
}
