using System;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Windows.UI;

namespace WishWinUI.Services;

/// <summary>颜色与淡入动画的小工具。</summary>
public static class ColorHelper
{
    /// <summary>把 #RRGGBB 或 #AARRGGBB 转成 Color。</summary>
    public static Color FromHex(string hex)
    {
        var value = hex.TrimStart('#');
        byte a = 255;
        if (value.Length == 8)
        {
            a = Convert.ToByte(value.Substring(0, 2), 16);
            value = value.Substring(2);
        }
        return Color.FromArgb(
            a,
            Convert.ToByte(value.Substring(0, 2), 16),
            Convert.ToByte(value.Substring(2, 2), 16),
            Convert.ToByte(value.Substring(4, 2), 16));
    }

    public static SolidColorBrush Brush(string hex) => new(FromHex(hex));
}

public static class AnimationHelper
{
    /// <summary>对任意 UIElement 做一次淡入入场动画。</summary>
    public static void FadeIn(this UIElement element, int durationMs = 260)
    {
        element.Opacity = 0;
        var sb = new Storyboard();
        var anim = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(durationMs),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
        };
        Storyboard.SetTarget(anim, element);
        Storyboard.SetTargetProperty(anim, "Opacity");
        sb.Children.Add(anim);
        sb.Begin();
    }
}
