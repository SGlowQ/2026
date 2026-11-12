using System;
using System.Collections.Generic;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Windows.Foundation;
using Windows.UI;
using XamlPath = Microsoft.UI.Xaml.Shapes.Path;

namespace WishWinUI.Views;

/// <summary>
/// 公用圆环图：把几个数值画成一个圆环，每段占的比例等于该数值占总数的比例。
///
/// 用法：给 Segments 塞数据（值 + 颜色 + 名字），然后调用 AnimateAsync() 播放增长动画。
/// 圆环中间可以放一段文字（比如总抽数）。
/// </summary>
public sealed class DonutChart : Grid
{
    private const double DefaultThickness = 22;

    private readonly Canvas _canvas = new();
    private readonly TextBlock _centerText = new();
    private readonly TextBlock _centerSubText = new();

    private readonly List<DonutSegment> _segments = new();

    private double _diameter = 180;
    private double _thickness = DefaultThickness;

    /// <summary>圆环外径。改大小时画布跟着变。</summary>
    public double Diameter
    {
        get => _diameter;
        set
        {
            _diameter = value;
            _canvas.Width = value;
            _canvas.Height = value;
            Redraw();
        }
    }

    /// <summary>环的粗细。</summary>
    public double Thickness
    {
        get => _thickness;
        set
        {
            _thickness = value;
            Redraw();
        }
    }

    public DonutChart()
    {
        HorizontalAlignment = HorizontalAlignment.Center;
        VerticalAlignment = VerticalAlignment.Center;

        _canvas.Width = _diameter;
        _canvas.Height = _diameter;
        Children.Add(_canvas);

        // 圆环中心的文字
        var center = new StackPanel
        {
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            Spacing = 2,
        };

        _centerText.FontFamily = UiFactory.Font("UiBlackFont");
        _centerText.FontWeight = Microsoft.UI.Text.FontWeights.Black;
        _centerText.FontSize = 26;
        _centerText.HorizontalAlignment = HorizontalAlignment.Center;

        _centerSubText.FontFamily = UiFactory.Font("UiLightFont");
        _centerSubText.FontWeight = Microsoft.UI.Text.FontWeights.Light;
        _centerSubText.FontSize = 12;
        _centerSubText.HorizontalAlignment = HorizontalAlignment.Center;
        _centerSubText.Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"];

        center.Children.Add(_centerText);
        center.Children.Add(_centerSubText);
        Children.Add(center);
    }

    /// <summary>设置圆环中心显示的数值和说明。</summary>
    public void SetCenter(string value, string caption)
    {
        _centerText.Text = value;
        _centerSubText.Text = caption;
    }

    /// <summary>设置圆环中心文字的颜色（跟随主题）。</summary>
    public void SetCenterBrush(Brush brush) => _centerText.Foreground = brush;

    /// <summary>设置分段：值是次数，颜色决定这一段的颜色。</summary>
    public void SetSegments(IReadOnlyList<DonutSegment> segments)
    {
        _segments.Clear();
        _segments.AddRange(segments);
        Redraw();
    }

    /// <summary>重画（不带动画）。</summary>
    public void Redraw() => Draw(1.0);

    /// <summary>
    /// 画圆环。progress 是动画进度（0~1），用来实现"从 0 长出来"的效果。
    /// </summary>
    private void Draw(double progress)
    {
        _canvas.Children.Clear();

        double total = 0;
        foreach (var s in _segments) total += Math.Max(0, s.Value);
        if (total <= 0) return;

        double radius = _diameter / 2 - _thickness / 2;
        double cx = _diameter / 2;
        double cy = _diameter / 2;

        // 从 12 点方向开始，顺时针画
        double startAngle = -90;

        foreach (var segment in _segments)
        {
            double value = Math.Max(0, segment.Value);
            if (value <= 0) continue;

            double sweep = value / total * 360.0 * progress;
            if (sweep <= 0) continue;

            // 整圈用两个半圆拼，避免 ArcSegment 在 360° 时画不出来
            if (sweep >= 359.99)
            {
                var full = new Ellipse
                {
                    Width = radius * 2,
                    Height = radius * 2,
                    Stroke = segment.Brush,
                    StrokeThickness = _thickness,
                    Fill = null,
                };
                Canvas.SetLeft(full, cx - radius);
                Canvas.SetTop(full, cy - radius);
                _canvas.Children.Add(full);
                startAngle += 360.0 * progress;
                continue;
            }

            var path = BuildArc(cx, cy, radius, startAngle, sweep, _thickness, segment.Brush);
            _canvas.Children.Add(path);

            startAngle += sweep;
        }
    }

    /// <summary>把一段圆弧画成带粗细的 Path（用 ArcSegment 描边）。</summary>
    private static XamlPath BuildArc(
        double cx, double cy, double radius,
        double startAngle, double sweep, double thickness, Brush brush)
    {
        Point start = Polar(cx, cy, radius, startAngle);
        Point end = Polar(cx, cy, radius, startAngle + sweep);

        var figure = new PathFigure
        {
            StartPoint = start,
            IsClosed = false,
            IsFilled = false,
        };

        figure.Segments.Add(new ArcSegment
        {
            Point = end,
            Size = new Size(radius, radius),
            SweepDirection = SweepDirection.Clockwise,
            IsLargeArc = sweep > 180,
        });

        var geometry = new PathGeometry();
        geometry.Figures.Add(figure);

        return new XamlPath
        {
            Data = geometry,
            Stroke = brush,
            StrokeThickness = thickness,
            StrokeStartLineCap = PenLineCap.Flat,
            StrokeEndLineCap = PenLineCap.Flat,
        };
    }

    private static Point Polar(double cx, double cy, double radius, double angleDegrees)
    {
        double rad = angleDegrees * Math.PI / 180.0;
        return new Point(cx + radius * Math.Cos(rad), cy + radius * Math.Sin(rad));
    }
}

/// <summary>圆环图的一段。</summary>
public sealed class DonutSegment
{
    public double Value { get; init; }
    public Brush Brush { get; init; } = new SolidColorBrush(Microsoft.UI.Colors.Gray);
    public string Label { get; init; } = string.Empty;
}
