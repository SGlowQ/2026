using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace WishWinUI;

/// <summary>
/// 防多开：用命名互斥体保证只跑一个实例。
/// 第二次双击时，把已在运行的窗口叫到前台，然后新进程自己退出。
/// </summary>
internal static class SingleInstance
{
    /// <summary>Local\ 前缀表示只在当前登录会话内生效，多用户互不影响。</summary>
    private const string MutexName = @"Local\WishLamp.Countdown.Wish2026.SingleInstance";

    /// <summary>主窗口标题，用来找到已经在跑的那个窗口。</summary>
    private const string WindowTitle = "祈愿与倒计时";

    private static Mutex? _mutex;

    /// <summary>
    /// 尝试成为唯一实例。返回 false 表示已经有实例在跑（此时调用方应该退出）。
    /// </summary>
    public static bool TryAcquire()
    {
        try
        {
            _mutex = new Mutex(initiallyOwned: true, MutexName, out bool createdNew);
            if (createdNew) return true;

            // 已经存在：放掉句柄，让已有实例继续持有
            _mutex.Dispose();
            _mutex = null;
            return false;
        }
        catch
        {
            // 拿不到互斥体（权限异常等）就别拦着用户，正常启动
            return true;
        }
    }

    /// <summary>把已经在跑的实例叫到前台。缩小状态先还原，再提到最前。</summary>
    public static void ActivateExistingWindow()
    {
        IntPtr found = IntPtr.Zero;

        EnumWindows((hWnd, _) =>
        {
            if (!IsWindowVisible(hWnd)) return true;

            int len = GetWindowTextLength(hWnd);
            if (len <= 0) return true;

            var sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            if (sb.ToString() != WindowTitle) return true;

            found = hWnd;
            return false;   // 找到了，停止枚举
        }, IntPtr.Zero);

        if (found == IntPtr.Zero) return;

        if (IsIconic(found)) ShowWindow(found, SW_RESTORE);

        BringToFront(found);
    }

    /// <summary>
    /// 把窗口提到最前。Windows 不允许后台进程随便抢焦点，
    /// 这里把自己的输入队列临时挂到前台窗口的线程上，绕过限制。
    /// </summary>
    private static void BringToFront(IntPtr hWnd)
    {
        IntPtr foreground = GetForegroundWindow();
        uint thisThread = GetCurrentThreadId();

        if (foreground != IntPtr.Zero)
        {
            uint fgThread = GetWindowThreadProcessId(foreground, out _);
            if (fgThread != 0 && fgThread != thisThread)
            {
                AttachThreadInput(thisThread, fgThread, true);
                BringWindowToTop(hWnd);
                SetForegroundWindow(hWnd);
                AttachThreadInput(thisThread, fgThread, false);
                return;
            }
        }

        BringWindowToTop(hWnd);
        SetForegroundWindow(hWnd);
    }

    private const int SW_RESTORE = 9;

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left, Top, Right, Bottom;
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();
}
