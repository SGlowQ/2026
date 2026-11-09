using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace WishWinUI.Services;

/// <summary>
/// 网络时间同步。
///
/// 全部按北京时间（UTC+8）计算，不依赖系统时区设置：
/// 服务器返回的 Date 头是 UTC，直接换算成 UTC+8，避免 LocalDateTime 被旧时区污染。
/// 默认走「联网功能」里的「网络时间」开关。
/// </summary>
public static class NetworkTime
{
    /// <summary>北京时间偏移（UTC+8，无夏令时）。</summary>
    public static readonly TimeSpan BeijingOffset = TimeSpan.FromHours(8);

    private static readonly HttpClient Http = CreateClient();
    private static TimeSpan _offset = TimeSpan.Zero;

    /// <summary>是否已成功从网络同步过。</summary>
    public static bool Synced { get; private set; }

    /// <summary>时间来源描述。</summary>
    public static string Source { get; private set; } = "本机时间";

    /// <summary>按北京时间显示的当前时间（网络对齐后）。</summary>
    public static DateTime Now => DateTime.UtcNow + BeijingOffset + _offset;

    /// <summary>是否允许联网取时间（跟随「网络时间」开关）。</summary>
    public static bool Enabled { get; set; } = true;

    // ============ 高精度时间源（RapidAPI World Time）============
    // 返回毫秒级 UTC 时间，比 HTTP Date 头（秒级）精确得多。
    // 只在启动时调用一次，不轮询。
    private const string RapidApiUrl =
        "https://world-time-api3.p.rapidapi.com/timezone/Asia/Shanghai";

    private const string RapidApiKey = "321cc957b9msh51719babd0797e6p16a1d0jsn19a6f50ea3b0";
    private const string RapidApiHost = "world-time-api3.p.rapidapi.com";

    private static HttpClient CreateClient()
    {
        var handler = new SocketsHttpHandler
        {
            // 跳过代理自动探测，避免首次请求卡在 WPAD 上十几秒
            UseProxy = false,
            ConnectTimeout = TimeSpan.FromSeconds(8),
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(12) };

        // RapidAPI 会拒绝没有 UA 的请求，必须带
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "User-Agent", "WishCountdown/2.1 (Windows; +https://sglowq.github.io/2026)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");

        return client;
    }

    /// <summary>
    /// 用 RapidAPI 的 World Time 接口取毫秒级 UTC 时间。
    /// 成功返回 true 并更新偏移；失败返回 false，让调用方回退到其它源。
    /// </summary>
    private static async Task<bool> TryRapidApiAsync()
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, RapidApiUrl);
            request.Headers.TryAddWithoutValidation("X-RapidAPI-Key", RapidApiKey);
            request.Headers.TryAddWithoutValidation("X-RapidAPI-Host", RapidApiHost);

            var sent = DateTimeOffset.UtcNow;
            using var response = await Http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            var received = DateTimeOffset.UtcNow;

            if (!response.IsSuccessStatusCode) return false;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("utc_datetime", out var utcProp)) return false;
            var text = utcProp.GetString();
            if (string.IsNullOrEmpty(text)) return false;

            // 形如 "2026-11-08T14:05:29.519+00:00"
            if (!DateTimeOffset.TryParse(text,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal,
                    out var serverUtc))
            {
                return false;
            }

            // 补偿网络延迟的一半
            var halfRtt = TimeSpan.FromMilliseconds((received - sent).TotalMilliseconds / 2);
            var serverNow = serverUtc + halfRtt;

            _offset = serverNow.UtcDateTime - DateTime.UtcNow;
            Synced = true;
            Source = "网络时间（北京时间 · 高精度）";
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>清掉已同步的偏移，立即回到本机时间。</summary>
    public static void Reset()
    {
        _offset = TimeSpan.Zero;
        Synced = false;
        Source = "本机时间";
    }

    /// <summary>
    /// 同步北京时间。成功返回 true。
    /// </summary>
    public static async Task<bool> SyncAsync()
    {
        if (!Enabled)
        {
            Reset();
            return false;
        }

        // 先试高精度时间源（毫秒级）；失败再走下面的 HTTP Date 头方案
        if (await TryRapidApiAsync())
        {
            return true;
        }

        foreach (var url in new[]
                 {
                     "https://quan.suning.com/getSysTime.do",
                     "https://www.baidu.com/",
                     "https://vv.video.qq.com/checktime?otype=json",
                 })
        {
            try
            {
                var sent = DateTimeOffset.UtcNow;
                using var response = await Http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
                var received = DateTimeOffset.UtcNow;

                if (response.Headers.Date is not { } serverUtc) continue;

                // 用请求往返的一半补偿延迟
                var halfRtt = TimeSpan.FromMilliseconds((received - sent).TotalMilliseconds / 2);
                var serverNow = serverUtc + halfRtt;

                // 当前 UTC 时间（本机时钟）与服务器 UTC 的差
                _offset = serverNow.UtcDateTime - DateTime.UtcNow;

                Synced = true;
                Source = "网络时间（北京时间）";
                return true;
            }
            catch
            {
                // 换下一个源
            }
        }

        // 全部失败：保留本机时间
        _offset = TimeSpan.Zero;
        Synced = false;
        Source = "本机时间";
        return false;
    }
}
