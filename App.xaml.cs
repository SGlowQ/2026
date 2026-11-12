using Microsoft.UI.Xaml;

namespace WishWinUI;

/// <summary>WinUI 3 入口：加载设置、历史与角色池，然后打开主窗口。</summary>
public partial class App : Application
{
    private Window? _window;

    /// <summary>全局设置（代替网页的 localStorage）。</summary>
    public Core.AppSettings Settings { get; private set; } = new();
    /// <summary>抽卡历史与每周保底状态。</summary>
    public Core.HistoryStore Store { get; private set; } = null!;

    /// <summary>抽卡引擎。</summary>
    public Core.GachaEngine Engine { get; private set; } = null!;

    /// <summary>
    /// 重新读取存储（更改数据目录后调用）。
    /// HistoryStore 在构造时就固定了路径，所以直接换新实例。
    /// </summary>
    public void ReloadStorage()
    {
        Store = new Core.HistoryStore(Settings.HistoryPath);
        Engine = new Core.GachaEngine(Store);
        var names = Settings.ActiveNames.Count > 0 ? Settings.ActiveNames : DefaultNames;
        Engine.AttachPool(Core.CharacterPool.Build(names));
        Engine.RefreshWeek();
    }

    /// <summary>从磁盘重新读取全部数据（导入备份后调用）。</summary>
    public void ReloadFromDisk()
    {
        Settings = Core.AppSettings.Load();
        ReloadStorage();
        Services.NetworkTime.Enabled = Settings.TimeSyncEnabled;
        MainWindowInstance?.ApplyTheme(Settings.ThemeMode);
    }


    /// <summary>
    /// 默认名单：保持为空。
    /// 首次启动时由用户在「名单」页导入或粘贴自己班级的名字，
    /// 不预置任何示例数据，避免把别人的姓名带进安装包。
    /// </summary>
    public List<string> DefaultNames { get; } = [];

    public MainWindow? MainWindowInstance { get; private set; }

    /// <summary>当前 App 实例（WinUI 里 Application.Current 的强类型入口）。</summary>
    public static App Instance => (App)Current;

    public App()
    {
        InitializeComponent();
        UnhandledException += (_, e) =>
        {
            try
            {
                Directory.CreateDirectory(Core.AppSettings.SettingsDirectory);
                File.AppendAllText(Path.Combine(Core.AppSettings.SettingsDirectory, "crash.log"),
                    DateTime.Now.ToString("s") + " " + e.Exception + Environment.NewLine);
            }
            catch { }
            e.Handled = true;
        };
    }

    [System.Runtime.InteropServices.DllImport("shell32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string appId);

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        // 防多开：已经有实例在跑就把它叫到前台，然后自己退出
        if (!SingleInstance.TryAcquire())
        {
            SingleInstance.ActivateExistingWindow();
            Exit();
            return;
        }

        // 让任务栏把本程序当成独立应用（否则图标可能显示成通用 exe 图标或合并到别的应用）
        try
        {
            SetCurrentProcessExplicitAppUserModelID("WishLamp.Countdown.Wish2026");
        }
        catch
        {
            // 设置失败不影响使用
        }
        Settings = Core.AppSettings.Load();
        Services.NetworkTime.Enabled = Settings.TimeSyncEnabled;

        // 后台预热一言连接，避免第一次打开倒计时页等太久
        if (Settings.QuoteEnabled)
        {
            Services.OnlineContent.WarmUp();
        }

        ReloadStorage();

        _window = new MainWindow();
        MainWindowInstance = (MainWindow)_window;
        _window.Activate();

    }
}
