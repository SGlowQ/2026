using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using WishWinUI.Core;
using WishWinUI.Views;

namespace WishWinUI;

/// <summary>
/// 主窗口：左侧导航（倒计时 / 祈愿 / 历史记录 / 名单 / 关于），界面风格对齐 Windows 设置。
/// </summary>
public sealed partial class MainWindow : Window
{

    public MainWindow()
    {
        InitializeComponent();

        ExtendsContentIntoTitleBar = true;
        SetTitleBar(AppTitleBar);
        // 任务栏 / 标题栏图标：优先用 exe 里自带的图标资源（单文件发布也能用），
        // 取不到时再退回同目录的 Assets\AppIcon.ico
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "AppIcon.ico");
        if (File.Exists(iconPath))
        {
            AppWindow.SetIcon(iconPath);
        }
        else
        {
            try
            {
                var exe = Environment.ProcessPath;
                if (!string.IsNullOrEmpty(exe)) AppWindow.SetIcon(exe);
            }
            catch
            {
                AppWindow.SetIcon("Assets/AppIcon.ico");
            }
        }
        Title = "祈愿与倒计时";

        // 恢复上次的窗口尺寸和位置
        RestoreWindowPlacement();

        // 关闭时保存窗口位置
        AppWindow.Closing += (_, _) => SaveWindowPlacement();

        // 默认进倒计时页
        Navigate(typeof(CountdownPage));

        // 统一字体：标题栏等控件的字体写死在模板里，资源覆盖不到，加载后补一次
        RootLayout.Loaded += (_, _) => Services.FontHelper.ApplyAll(RootLayout);
        Nav.SelectedItem = Nav.MenuItems[0];
    }

    public App HostApp => (App)Application.Current;

    public GachaEngine Engine => HostApp.Engine;

    /// <summary>切到指定页面（供其他页面调用）。</summary>
    public void NavigateTo(string tag)
    {
        foreach (var item in Nav.MenuItems.OfType<NavigationViewItem>())
        {
            if ((item.Tag as string) == tag)
            {
                Nav.SelectedItem = item;
                return;
            }
        }
    }

    private void Nav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.SelectedItem is not NavigationViewItem item) return;
        switch (item.Tag as string)
        {
            case "countdown": Navigate(typeof(CountdownPage)); break;
            case "wish": Navigate(typeof(WishPage)); break;
            case "history": Navigate(typeof(HistoryPage)); break;
            case "stats": Navigate(typeof(StatsPage)); break;
            case "roster": Navigate(typeof(RosterPage)); break;
            case "about": Navigate(typeof(AboutPage)); break;
        }
    }

    /// <summary>
    /// 页面实例缓存：每个页面只创建一次，切换选项卡时复用同一个对象。
    /// 这样倒计时页的定时器、网络时间、一言都不会因为切页而重置。
    /// </summary>
    private readonly Dictionary<Type, Page> _pageCache = new();

    private void Navigate(Type pageType)
    {
        if (!_pageCache.TryGetValue(pageType, out var page))
        {
            page = (Page)Activator.CreateInstance(pageType)!;
            _pageCache[pageType] = page;
        }
        ContentFrame.Content = page;

        // 页面里的控件（尤其是代码动态生成的）也统一字体。
        // 排到布局之后再执行，才能覆盖到刚生成出来的内容。
        DispatcherQueue.TryEnqueue(
            Microsoft.UI.Dispatching.DispatcherQueuePriority.Low,
            () => Services.FontHelper.ApplyAll(page));
    }

    /// <summary>
    /// 让倒计时页按当前联网设置重新拉一言、重算时间来源（关于页切换开关时调用）。
    /// </summary>
    public async void ReloadCountdownContent()
    {
        if (_pageCache.TryGetValue(typeof(CountdownPage), out var page)
            && page is CountdownPage countdown)
        {
            await countdown.ReloadQuoteAsync();
        }
    }

    /// <summary>只刷新时间来源显示（切换「网络时间」开关时调用）。</summary>
    public void RefreshTimeSource()
    {
        if (_pageCache.TryGetValue(typeof(CountdownPage), out var page)
            && page is CountdownPage countdown)
        {
            countdown.RefreshTimeSource();
        }
    }

    /// <summary>恢复上次关闭时的窗口尺寸与位置；没有记录就用默认值。</summary>
    private void RestoreWindowPlacement()
    {
        var s = App.Instance?.Settings;

        try
        {
            int w = s?.WindowWidth is > 400 ? (int)s.WindowWidth : 1280;
            int h = s?.WindowHeight is > 300 ? (int)s.WindowHeight : 860;

            // 先按保存的尺寸摆放；位置也有效时才恢复位置
            var pos = new Windows.Graphics.PointInt32(
                s?.WindowLeft is { } left ? (int)left : 100,
                s?.WindowTop is { } top ? (int)top : 60);

            bool hasPos = s?.WindowLeft != null && s?.WindowTop != null;

            if (hasPos && IsPositionOnScreen(pos.X, pos.Y, w, h))
            {
                AppWindow.MoveAndResize(new Windows.Graphics.RectInt32(pos.X, pos.Y, w, h));
            }
            else
            {
                AppWindow.Resize(new Windows.Graphics.SizeInt32(w, h));
            }

            if (s?.WindowMaximized == true)
            {
                (AppWindow.Presenter as OverlappedPresenter)?.Maximize();
            }
        }
        catch
        {
            // 恢复失败就用默认尺寸
            try { AppWindow.Resize(new Windows.Graphics.SizeInt32(1280, 860)); } catch { }
        }
    }

    /// <summary>位置是否还落在某个显示器上（防止拔掉副屏后窗口跑到屏幕外）。</summary>
    private static bool IsPositionOnScreen(int x, int y, int width, int height)
    {
        try
        {
            var display = Microsoft.UI.Windowing.DisplayArea.GetFromPoint(
                new Windows.Graphics.PointInt32(x + width / 2, y + height / 2),
                Microsoft.UI.Windowing.DisplayAreaFallback.Nearest);
            return display != null;
        }
        catch
        {
            return true;   // 判断不了就当有效
        }
    }

    /// <summary>关闭前保存窗口位置。</summary>
    private void SaveWindowPlacement()
    {
        try
        {
            var s = App.Instance?.Settings;
            if (s == null) return;

            var presenter = AppWindow.Presenter as OverlappedPresenter;
            bool maximized = presenter?.State == OverlappedPresenterState.Maximized;
            s.WindowMaximized = maximized;

            // 最大化时记录的是最大化后的尺寸，意义不大；只记录还原后的位置
            if (!maximized)
            {
                var pos = AppWindow.Position;
                var size = AppWindow.Size;
                s.WindowLeft = pos.X;
                s.WindowTop = pos.Y;
                s.WindowWidth = size.Width;
                s.WindowHeight = size.Height;
            }

            s.Save();
        }
        catch
        {
            // 保存失败不影响退出
        }
    }

    /// <summary>应用主题：0 跟随系统 / 1 深色 / 2 浅色。</summary>
    public void ApplyTheme(int mode)
    {
        try
        {
            if (Content is FrameworkElement root)
            {
                root.RequestedTheme = mode switch
                {
                    1 => ElementTheme.Dark,
                    2 => ElementTheme.Light,
                    _ => ElementTheme.Default,
                };
            }
        }
        catch
        {
            // 主题切换失败不影响使用
        }
    }

    /// <summary>按标签名导航（对应 NavigationViewItem 的 Tag）。</summary>
    private void NavigateByTag(string tag)
    {
        Type pageType = tag switch
        {
            "countdown" => typeof(CountdownPage),
            "wish" => typeof(WishPage),
            "history" => typeof(HistoryPage),
            "stats" => typeof(StatsPage),
            "roster" => typeof(RosterPage),
            "about" => typeof(AboutPage),
            _ => typeof(CountdownPage),
        };
        Navigate(pageType);

        // 同步左侧导航的选中状态
        foreach (var item in Nav.MenuItems.OfType<NavigationViewItem>())
        {
            if (item.Tag as string == tag)
            {
                Nav.SelectedItem = item;
                break;
            }
        }
    }

    /// <summary>
    /// 全局快捷键：
    /// Ctrl+1~6 切换页面，Ctrl+Enter 抽一次，Ctrl+Shift+Enter 十连。
    /// </summary>
    private void Root_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (!IsCtrlDown()) return;

        // Ctrl+1~6 切页面
        if (e.Key >= Windows.System.VirtualKey.Number1 && e.Key <= Windows.System.VirtualKey.Number6)
        {
            int i = (int)e.Key - (int)Windows.System.VirtualKey.Number1;
            NavigateByTag(PageTags[i]);
            e.Handled = true;
            return;
        }

        // Ctrl+Enter 抽卡（Shift 十连）
        if (e.Key is Windows.System.VirtualKey.Enter or Windows.System.VirtualKey.Accept)
        {
            NavigateByTag("wish");
            if (_pageCache.TryGetValue(typeof(WishPage), out var page) && page is WishPage wish)
            {
                wish.TriggerDraw(IsKeyDown(Windows.System.VirtualKey.Shift) ? 10 : 1);
            }
            e.Handled = true;
        }
    }

    /// <summary>左侧导航顺序，对应 Ctrl+1~6。</summary>
    private static readonly string[] PageTags = ["countdown", "wish", "history", "stats", "roster", "about"];

    private static bool IsCtrlDown() => IsKeyDown(Windows.System.VirtualKey.Control);

    private static bool IsKeyDown(Windows.System.VirtualKey key) =>
        Microsoft.UI.Input.InputKeyboardSource
            .GetKeyStateForCurrentThread(key)
            .HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down);

    internal void ShowToast(string message, bool error = false)
    {
        ToastBar.Message = message;
        ToastBar.Severity = error ? InfoBarSeverity.Error : InfoBarSeverity.Success;
        ToastBar.IsOpen = true;
        var timer = DispatcherQueue.CreateTimer();
        timer.Interval = TimeSpan.FromSeconds(error ? 3.4 : 2.2);
        timer.IsRepeating = false;
        timer.Tick += (_, _) => ToastBar.IsOpen = false;
        timer.Start();
    }

}
