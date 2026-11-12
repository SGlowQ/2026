using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using WishWinUI.Core;
using WishWinUI.Services;

namespace WishWinUI.Views;

/// <summary>关于页：版本信息、偏好设置、数据管理（更改位置 / 分别清除）、折叠说明。</summary>
public sealed partial class AboutPage : Page
{
    public AboutPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await InitializeAsync();
    }

    private MainWindow Host => (MainWindow)App.Instance.MainWindowInstance!;

    private App HostApp => App.Instance;

    /// <summary>logo 只加载一次，之后复用（从 ico 解析图片是耗时的磁盘 IO）。</summary>
    private Microsoft.UI.Xaml.Media.ImageSource? _cachedLogo;

    private async Task InitializeAsync()
    {
        VersionText.Text = "版本 " + (Environment.ProcessPath is { } p ? FileVersionInfo.GetVersionInfo(p).FileVersion : "2.0.0");
        QuoteSwitch.IsOn = HostApp.Settings.QuoteEnabled;
        TimeSwitch.IsOn = HostApp.Settings.TimeSyncEnabled;
        ThemeCombo.SelectedIndex = Math.Clamp(HostApp.Settings.ThemeMode, 0, 2);
        DataPathText.Text = AppSettings.SettingsDirectory;
        RefreshDataFolderButtons();
        RefreshCounts();

        // 从 ico 文件里取出最合适的一帧作为 logo，避免又一张空白图。
        // 只在第一次加载，之后直接用缓存，切回关于页不再读磁盘。
        if (_cachedLogo == null)
        {
            _cachedLogo = await IcoLoader.LoadImageAsync(128);
            if (_cachedLogo == null)
            {
                try
                {
                    _cachedLogo = new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(
                        new Uri("ms-appx:///Assets/Square44x44Logo.scale-200.png"));
                }
                catch { }
            }
        }

        if (_cachedLogo != null)
        {
            AppLogo.Source = _cachedLogo;
        }
        else
        {
            try
            {
                AppLogo.Visibility = Visibility.Collapsed;
            }
            catch { }
        }
    }

    /// <summary>刷新「清除数据」卡片里的数量说明。</summary>
    private void RefreshCounts()
    {
        var store = HostApp.Store;
        int totalRecords = store.WeekKeys
            .Select(k => store.Peek(k)?.History.Count ?? 0)
            .Sum();
        int weeks = store.WeekKeys.Count;

        HistoryCountText.Text = totalRecords == 0
            ? "暂无记录"
            : $"{totalRecords} 条记录，跨 {weeks} 周";

        int names = HostApp.Settings.ActiveNames.Count;
        RosterCountText.Text = names == 0 ? "暂无名单" : $"{names} 人";

        int targets = HostApp.Settings.Targets.Count(t => !t.IsSpringFestival);
        TargetCountText.Text = targets == 0 ? "暂无自定义目标（仍在用春节）" : $"{targets} 个自定义目标";
    }

    /// <summary>统一的删除确认框。</summary>
    private async Task<bool> ConfirmDeleteAsync(string title, string message)
    {
        var dialog = new ContentDialog
        {
            Title = title,
            Content = new TextBlock
            {
                Text = message,
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 22,
            },
            PrimaryButtonText = "删除",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }

    /// <summary>清除全部抽卡记录（所有周）。</summary>
    private async void ClearHistory_Click(object sender, RoutedEventArgs e)
    {
        var store = HostApp.Store;
        int total = store.WeekKeys
            .Select(k => store.Peek(k)?.History.Count ?? 0)
            .Sum();

        if (total == 0)
        {
            Host.ShowToast("还没有抽卡记录");
            return;
        }

        if (!await ConfirmDeleteAsync(
            "清除全部抽卡记录？",
            $"将永久删除 {store.WeekKeys.Count} 周共 {total} 条抽卡记录，以及五星/四星保底进度和捕获明光状态。\n\n此操作无法撤销。"))
        {
            return;
        }

        HostApp.Store.ClearAll();
        HostApp.Engine.RefreshWeek();
        RefreshCounts();
        Host.ShowToast($"已清除 {total} 条抽卡记录");
    }

    /// <summary>清除自定义名单。</summary>
    private async void ClearRoster_Click(object sender, RoutedEventArgs e)
    {
        int names = HostApp.Settings.ActiveNames.Count;
        if (names == 0)
        {
            Host.ShowToast("还没有名单");
            return;
        }

        if (!await ConfirmDeleteAsync(
            "清除名单？",
            $"将删除当前分组里的 {names} 个名字，角色池和本期 UP 会一起重置，之后需要重新导入才能抽卡。\n\n此操作无法撤销。"))
        {
            return;
        }

        var group = HostApp.Settings.ActiveGroup;
        if (group != null) group.Names = [];
        HostApp.Settings.Save();
        HostApp.Engine.AttachPool(CharacterPool.Build([]));
        RefreshCounts();
        Host.ShowToast("名单已清除");
    }

    /// <summary>清除自定义倒计时目标（春节目标保留）。</summary>
    private async void ClearTargets_Click(object sender, RoutedEventArgs e)
    {
        var custom = HostApp.Settings.Targets.Where(t => !t.IsSpringFestival).ToList();
        if (custom.Count == 0)
        {
            Host.ShowToast("没有自定义目标，当前跟随春节");
            return;
        }

        if (!await ConfirmDeleteAsync(
            "清除倒计时目标？",
            $"将删除 {custom.Count} 个自定义倒计时目标，倒计时会恢复成自动跟随下一个春节。\n\n此操作无法撤销。"))
        {
            return;
        }

        HostApp.Settings.Targets.Clear();
        HostApp.Settings.ActiveTargetId = string.Empty;
        HostApp.Settings.Save();
        HostApp.MainWindowInstance?.RefreshTimeSource();
        RefreshCounts();
        Host.ShowToast("自定义目标已清除，倒计时恢复跟随春节");
    }

    /// <summary>主题切换：0 跟随系统 / 1 深色 / 2 浅色。</summary>
    private void ThemeCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!IsLoaded) return;
        int mode = Math.Clamp(ThemeCombo.SelectedIndex, 0, 2);
        HostApp.Settings.ThemeMode = mode;
        HostApp.Settings.Save();

        HostApp.MainWindowInstance?.ApplyTheme(mode);

        Host.ShowToast(mode switch
        {
            1 => "已切换到深色主题",
            2 => "已切换到浅色主题",
            _ => "主题已跟随系统",
        });
    }

    /// <summary>导出备份：把 settings.json 和 history.json 打包成一个 .zip。</summary>
    private async void ExportBackup_Click(object sender, RoutedEventArgs e)
    {
        var dir = AppSettings.SettingsDirectory;
        var files = new[] { "settings.json", "history.json" }
            .Select(f => Path.Combine(dir, f))
            .Where(File.Exists)
            .ToList();

        if (files.Count == 0)
        {
            Host.ShowToast("还没有可备份的数据", error: true);
            return;
        }

        var picker = new Windows.Storage.Pickers.FileSavePicker
        {
            SuggestedFileName = $"祈愿与倒计时_备份_{DateTime.Now:yyyyMMdd_HHmm}",
        };
        picker.FileTypeChoices.Add("备份文件", new List<string> { ".zip" });
        WinRT.Interop.InitializeWithWindow.Initialize(
            picker, WinRT.Interop.WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));

        var file = await picker.PickSaveFileAsync();
        if (file == null) return;

        try
        {
            File.Delete(file.Path);
            System.IO.Compression.ZipFile.CreateFromDirectory(dir, file.Path,
                System.IO.Compression.CompressionLevel.Optimal, includeBaseDirectory: false);
            Host.ShowToast("备份已导出");
        }
        catch (Exception ex)
        {
            Host.ShowToast("导出失败：" + ex.Message, error: true);
        }
    }

    /// <summary>从备份恢复：会覆盖当前数据。</summary>
    private async void ImportBackup_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileOpenPicker();
        picker.FileTypeFilter.Add(".zip");
        WinRT.Interop.InitializeWithWindow.Initialize(
            picker, WinRT.Interop.WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));

        var file = await picker.PickSingleFileAsync();
        if (file == null) return;

        var confirm = new ContentDialog
        {
            Title = "导入备份？",
            Content = new TextBlock
            {
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 22,
                Text = "当前的名单、抽卡记录和设置会被备份文件里的内容覆盖。\n\n建议先导出现在这份再导入。此操作无法撤销。",
            },
            PrimaryButtonText = "覆盖导入",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        if (await confirm.ShowAsync() != ContentDialogResult.Primary) return;

        try
        {
            System.IO.Compression.ZipFile.ExtractToDirectory(file.Path, AppSettings.SettingsDirectory, overwriteFiles: true);

            // 重新读取
            HostApp.ReloadFromDisk();

            Host.ShowToast("备份已导入，数据已刷新");
        }
        catch (Exception ex)
        {
            Host.ShowToast("导入失败：" + ex.Message, error: true);
        }
    }

    /// <summary>展开 / 收起「说明」。</summary>
    private void HelpToggle_Click(object sender, RoutedEventArgs e)
    {
        bool show = HelpPanel.Visibility != Visibility.Visible;
        HelpPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
        // 收起时箭头朝下，展开时朝上
        HelpChevron.Glyph = show ? "\uE70E" : "\uE70D";
    }

    /// <summary>一言开关：立即生效。</summary>
    private void QuoteSwitch_Toggled(object sender, RoutedEventArgs e)
    {
        if (!IsLoaded) return;
        HostApp.Settings.QuoteEnabled = QuoteSwitch.IsOn;
        HostApp.Settings.Save();

        // 立即生效：让倒计时页重新拉一言
        HostApp.MainWindowInstance?.ReloadCountdownContent();

        Host.ShowToast(QuoteSwitch.IsOn ? "已开启一言" : "已关闭一言");
    }

    /// <summary>网络时间开关：立即生效。</summary>
    private async void TimeSwitch_Toggled(object sender, RoutedEventArgs e)
    {
        if (!IsLoaded) return;
        HostApp.Settings.TimeSyncEnabled = TimeSwitch.IsOn;
        NetworkTime.Enabled = TimeSwitch.IsOn;

        if (TimeSwitch.IsOn)
        {
            // 打开时立刻同步一次，让时间马上正确
            await NetworkTime.SyncAsync();
        }
        else
        {
            NetworkTime.Reset();
        }

        HostApp.Settings.Save();
        HostApp.MainWindowInstance?.RefreshTimeSource();

        Host.ShowToast(TimeSwitch.IsOn
            ? (NetworkTime.Synced ? "已开启网络时间（北京时间）" : "已开启网络时间，但暂未同步成功")
            : "已关闭网络时间，使用本机时间");
    }

    private void OpenDataFolder_Click(object sender, RoutedEventArgs e)
    {
        var dir = AppSettings.SettingsDirectory;

        try
        {
            Directory.CreateDirectory(dir);
        }
        catch
        {
            // 目录建不出来也继续尝试打开
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"\"{dir}\"",
                UseShellExecute = true,
            });
            return;
        }
        catch
        {
            // 换一种方式再试
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = dir,
                UseShellExecute = true,
            });
            return;
        }
        catch
        {
            // 都失败，下面提示路径
        }

        // 都失败了：至少把路径显示出来让用户自己复制
        Host.ShowToast($"打不开文件夹，路径：{dir}", error: true);
    }

    /// <summary>是否正在使用非默认的数据目录。</summary>
    private bool IsCustomDirectory =>
        !string.IsNullOrWhiteSpace(HostApp.Settings.CustomDataDirectory);

    /// <summary>刷新数据目录相关按钮的可见性。</summary>
    private void RefreshDataFolderButtons()
    {
        RestoreFolderButton.Visibility = IsCustomDirectory
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    /// <summary>把数据搬回默认目录（%AppData%\WishLamp\WishCountdown）。</summary>
    private async void RestoreDataFolder_Click(object sender, RoutedEventArgs e)
    {
        if (!IsCustomDirectory) return;

        var currentDir = AppSettings.SettingsDirectory;
        var defaultDir = AppSettings.DefaultDataDirectory;

        var confirm = new ContentDialog
        {
            Title = "恢复默认保存位置？",
            Content = new TextBlock
            {
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 22,
                Text = $"当前位置：\n{currentDir}\n\n" +
                       $"将搬回：\n{defaultDir}\n\n" +
                       "现有数据会复制到默认目录，之后改用默认位置。「恢复」不会删除旧目录里的文件。",
            },
            PrimaryButtonText = "恢复",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = XamlRoot,
        };
        if (await confirm.ShowAsync() != ContentDialogResult.Primary) return;

        try
        {
            Directory.CreateDirectory(defaultDir);

            // 把当前目录的数据复制到默认目录
            foreach (var fileName in new[] { "settings.json", "history.json" })
            {
                var src = Path.Combine(currentDir, fileName);
                if (!File.Exists(src)) continue;

                var dst = Path.Combine(defaultDir, fileName);
                // 默认目录已有数据时先备份，不直接覆盖
                if (File.Exists(dst))
                {
                    var backup = dst + $".bak_{DateTime.Now:yyyyMMddHHmmss}";
                    try { File.Move(dst, backup, overwrite: true); } catch { }
                }
                File.Copy(src, dst, overwrite: true);
            }

            // 清掉自定义目录设置
            HostApp.Settings.CustomDataDirectory = "";
            HostApp.Settings.Save();

            HostApp.ReloadStorage();

            DataPathText.Text = AppSettings.SettingsDirectory;
            RefreshDataFolderButtons();
            RefreshCounts();
            Host.ShowToast("已恢复默认保存位置");
        }
        catch (Exception ex)
        {
            Host.ShowToast("恢复失败：" + ex.Message, error: true);
        }
    }

    /// <summary>更改数据保存位置（会把现有数据一起搬过去）。</summary>
    private async void ChangeDataFolder_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FolderPicker();
        picker.FileTypeFilter.Add("*");
        WinRT.Interop.InitializeWithWindow.Initialize(
            picker, WinRT.Interop.WindowNative.GetWindowHandle(App.Instance.MainWindowInstance));

        var folder = await picker.PickSingleFolderAsync();
        if (folder == null) return;

        var newDir = Path.Combine(folder.Path, "WishCountdownData");
        var oldDir = AppSettings.SettingsDirectory;

        if (string.Equals(Path.GetFullPath(newDir), Path.GetFullPath(oldDir), StringComparison.OrdinalIgnoreCase))
        {
            Host.ShowToast("这个位置就是当前使用的位置");
            return;
        }

        var confirm = new ContentDialog
        {
            Title = "更改数据保存位置？",
            Content = new TextBlock
            {
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 22,
                Text = $"新位置：\n{newDir}\n\n现有的名单、抽卡记录和倒计时目标会一起复制过去，" +
                       $"原位置的文件保留不删。之后所有数据都读写新位置。",
            },
            PrimaryButtonText = "更改",
            CloseButtonText = "取消",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = XamlRoot,
        };
        if (await confirm.ShowAsync() != ContentDialogResult.Primary) return;

        try
        {
            Directory.CreateDirectory(newDir);

            // 把现有文件复制过去（不删原位置，留作备份）
            foreach (var fileName in new[] { "settings.json", "history.json" })
            {
                var src = Path.Combine(oldDir, fileName);
                if (!File.Exists(src)) continue;
                File.Copy(src, Path.Combine(newDir, fileName), overwrite: true);
            }

            // 切换设置并保存到新位置
            var settings = HostApp.Settings;
            settings.CustomDataDirectory = newDir;
            if (!File.Exists(Path.Combine(newDir, "settings.json")))
            {
                File.WriteAllText(Path.Combine(newDir, "settings.json"),
                    System.Text.Json.JsonSerializer.Serialize(settings, JsonContext.Default.AppSettings));
            }
            settings.Save();

            // 让引擎重新读取新位置的数据
            HostApp.ReloadStorage();

            DataPathText.Text = AppSettings.SettingsDirectory;
            RefreshDataFolderButtons();
            RefreshCounts();
            Host.ShowToast("数据位置已更改，重启后也会保留");
        }
        catch (Exception ex)
        {
            Host.ShowToast("更改失败：" + ex.Message, error: true);
        }
    }
}
