using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace WishWinUI.Services;

/// <summary>
/// 一言：从 hitokoto.cn 获取随机句子。
/// 不做离线兜底——拿不到就明确告诉用户「连接一言服务器失败」。
/// </summary>
public static class OnlineContent
{
    /// <summary>
    /// 单例 HttpClient。
    /// 显式禁用代理探测（否则首次请求可能卡在 WPAD 查找上十几秒），
    /// 并设置 UA，避免部分接口拒绝无 UA 请求。
    /// </summary>
    private static readonly HttpClient Http = CreateClient();

    private static HttpClient CreateClient()
    {
        var handler = new SocketsHttpHandler
        {
            UseProxy = false,
            AllowAutoRedirect = true,
            ConnectTimeout = TimeSpan.FromSeconds(15),
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            AutomaticDecompression = DecompressionMethods.All,
        };

        var client = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(60),
        };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("WishCountdown/2.0 (Windows; +https://sglowq.github.io/2026)");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    /// <summary>预热连接，减少第一次请求的等待（启动时调用）。</summary>
    public static void WarmUp()
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Head, "https://v1.hitokoto.cn/");
                using var response = await Http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            }
            catch
            {
                // 预热失败无所谓，正式请求会再试
            }
        });
    }

    /// <summary>
    /// 拉一条一言。
    /// 返回 (句子, 出处, 是否成功)。失败时句子和出处为空，调用方显示错误提示。
    /// </summary>
    public static async Task<(string Text, string From, bool Online)> FetchHitokotoAsync(bool onlineEnabled)
    {
        if (!onlineEnabled)
        {
            return (string.Empty, string.Empty, false);
        }

        try
        {
            var json = await Http.GetStringAsync("https://v1.hitokoto.cn/");
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            string text = root.TryGetProperty("hitokoto", out var h) ? (h.GetString() ?? string.Empty) : string.Empty;
            string from = root.TryGetProperty("from", out var f) ? (f.GetString() ?? string.Empty) : string.Empty;
            string who = root.TryGetProperty("from_who", out var w) && w.ValueKind == JsonValueKind.String
                ? (w.GetString() ?? string.Empty)
                : string.Empty;

            if (text.Length > 0)
            {
                var source = string.IsNullOrEmpty(who) || who == "null" ? from : from + " · " + who;
                return (text, source, true);
            }
        }
        catch
        {
            // 超时或网络异常，统一走失败分支
        }

        return (string.Empty, string.Empty, false);
    }
}
