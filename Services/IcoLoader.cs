using System;
using System.IO;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Microsoft.UI.Xaml.Media.Imaging;

namespace WishWinUI.Services;

/// <summary>
/// 直接解析 .ico 文件，取出最合适尺寸的那一帧给界面用。
/// .ico 里每一帧要么是 PNG、要么是 32 位 DIB，两种这里都处理，
/// 不依赖系统图标缓存或缩放，窗口/任务栏/关于页都能拿到清晰图标。
/// </summary>
public static class IcoLoader
{
    /// <summary>ico 路径：先找 exe 同目录的 Assets，再找开发时的源目录。</summary>
    public static string? ResolveIconPath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Assets", "AppIcon.ico"),
            Path.Combine(AppContext.BaseDirectory, "AppIcon.ico"),
        };
        foreach (var path in candidates)
        {
            if (File.Exists(path)) return path;
        }
        return null;
    }

    /// <summary>加载图标（返回 BitmapImage，可直接赋给 Image.Source）。</summary>
    public static async Task<BitmapImage?> LoadImageAsync(int preferSize = 256)
    {
        var path = ResolveIconPath();
        if (path == null) return null;
        var payload = ExtractBestFrame(path, preferSize);
        if (payload == null) return null;
        try
        {
            var image = new BitmapImage();
            using var stream = new MemoryStream(payload);
            await image.SetSourceAsync(stream.AsRandomAccessStream());
            return image;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>从 ico 文件里挑出最合适的一帧的原始字节（PNG 帧或 DIB 帧）。</summary>
    private static byte[]? ExtractBestFrame(string path, int preferSize)
    {
        try
        {
            var data = File.ReadAllBytes(path);
            if (data.Length < 6 || data[0] != 0 || data[1] != 0 || data[2] != 1 || data[3] != 0) return null;

            int count = BitConverter.ToUInt16(data, 4);
            int bestOffset = -1, bestLength = 0, bestScore = int.MaxValue;

            for (int i = 0; i < count; i++)
            {
                int entry = 6 + i * 16;
                if (entry + 16 > data.Length) break;
                int w = data[entry] == 0 ? 256 : data[entry];
                int h = data[entry + 1] == 0 ? 256 : data[entry + 1];
                int length = BitConverter.ToInt32(data, entry + 8);
                int offset = BitConverter.ToInt32(data, entry + 12);
                if (length <= 0 || offset <= 0 || offset + length > data.Length) continue;

                int score = Math.Abs(Math.Max(w, h) - preferSize);
                if (score < bestScore)
                {
                    bestScore = score;
                    bestOffset = offset;
                    bestLength = length;
                }
            }

            if (bestOffset < 0) return null;
            var frame = new byte[bestLength];
            Buffer.BlockCopy(data, bestOffset, frame, 0, bestLength);

            // PNG 帧直接用；DIB 帧先转成 PNG 编码的字节，统一交给 BitmapImage
            bool isPng = frame.Length > 8 && frame[0] == 0x89 && frame[1] == 0x50;
            return isPng ? frame : DibToPng(frame);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>把 32 位 DIB 帧用 BMP 容器包一层（BMP 的 DIB 段就是 ICO 的 DIB 段）。</summary>
    private static byte[]? DibToPng(byte[] dib)
    {
        if (dib.Length < 40) return null;
        int headerSize = BitConverter.ToInt32(dib, 0);
        int width = BitConverter.ToInt32(dib, 4);
        int rawHeight = BitConverter.ToInt32(dib, 8);
        int height = rawHeight / 2;
        int bitCount = BitConverter.ToInt16(dib, 14);
        if (width <= 0 || height <= 0 || bitCount != 32) return null;

        int stride = width * 4;
        int pixelStart = headerSize;
        int needed = pixelStart + stride * height;
        if (needed > dib.Length) return null;

        var pixels = new byte[width * height * 4];
        for (int y = 0; y < height; y++)
        {
            Buffer.BlockCopy(dib, pixelStart + (height - 1 - y) * stride, pixels, y * stride, stride);
        }

        using var bmp = new MemoryStream();
        using var writer = new BinaryWriter(bmp, System.Text.Encoding.ASCII, leaveOpen: true);
        writer.Write((ushort)0x4D42);
        writer.Write(14 + 40 + pixels.Length);
        writer.Write(0);
        writer.Write(14);
        writer.Write(40);
        writer.Write(width);
        writer.Write(-height);
        writer.Write((ushort)1);
        writer.Write((ushort)32);
        writer.Write(0);
        writer.Write(pixels.Length);
        writer.Write(2835);
        writer.Write(2835);
        writer.Write(0);
        writer.Write(0);
        writer.Flush();
        bmp.Write(pixels, 0, pixels.Length);
        return bmp.ToArray();
    }
}
