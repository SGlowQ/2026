using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;

namespace WishWinUI.Views;

/// <summary>
/// 数字小键盘弹层。用 Popup 实现，大按钮适配触屏智慧黑板。
/// </summary>
internal static class NumberPad
{
    /// <summary>弹出键盘；返回选中的数字，取消返回 null。</summary>
    public static async Task<int?> ShowAsync(XamlRoot xamlRoot, string hint, int current, int min, int max)
    {
        var tcs = new TaskCompletionSource<int?>();
        var input = new StringBuilder();

        var display = new TextBlock
        {
            Text = current.ToString(),
            FontSize = 40,
            FontWeight = Microsoft.UI.Text.FontWeights.Black,
            HorizontalAlignment = HorizontalAlignment.Center,
            Margin = new Thickness(0, 8, 0, 4),
        };

        var hintBlock = new TextBlock
        {
            Text = hint,
            FontSize = 13,
            HorizontalAlignment = HorizontalAlignment.Center,
            Margin = new Thickness(0, 0, 0, 16),
            Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
        };

        var pad = new Grid { ColumnSpacing = 10, RowSpacing = 10 };
        for (int c = 0; c < 3; c++)
            pad.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (int r = 0; r < 4; r++)
            pad.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        var card = new Border
        {
            Background = (Brush)Application.Current.Resources["AcrylicInAppFillColorDefaultBrush"],
            BorderBrush = (Brush)Application.Current.Resources["CardStrokeColorDefaultBrush"],
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8),
            Padding = new Thickness(20, 16, 20, 18),
            Width = 340,
            Child = new StackPanel
            {
                Children =
                {
                    new TextBlock
                    {
                        Text = "跳到第几页",
                        FontSize = 16,
                        FontWeight = Microsoft.UI.Text.FontWeights.Black,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        Margin = new Thickness(0, 0, 0, 4),
                    },
                    hintBlock,
                    display,
                    pad,
                },
            },
        };

        var popup = new Popup
        {
            XamlRoot = xamlRoot,
            Child = new Canvas { Width = 1, Height = 1 },
            IsLightDismissEnabled = true,
        };

        // 打开时按 XamlRoot 尺寸把卡片放到屏幕中央
        popup.Opened += (_, _) =>
        {
            double rootW = xamlRoot.Size.Width;
            double rootH = xamlRoot.Size.Height;

            card.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
            double cardW = card.DesiredSize.Width;
            double cardH = card.DesiredSize.Height;

            // 减掉底部任务栏的高度（约 48px），让卡片视觉上居中偏上一点
            double usableH = Math.Max(200, rootH - 48);

            var host = new Canvas
            {
                Width = rootW,
                Height = rootH,
            };
            Canvas.SetLeft(card, Math.Max(0, (rootW - cardW) / 2));
            Canvas.SetTop(card, Math.Max(0, (usableH - cardH) / 2));
            host.Children.Add(card);

            popup.Child = host;
        };

        void Update() => display.Text = input.Length > 0 ? input.ToString() : "—";

        void Close(int? result)
        {
            popup.IsOpen = false;
            if (!tcs.Task.IsCompleted) tcs.TrySetResult(result);
        }

        string[,] keys =
        {
            { "1", "2", "3" },
            { "4", "5", "6" },
            { "7", "8", "9" },
            { "⌫", "0", "确定" },
        };

        for (int r = 0; r < 4; r++)
        {
            for (int c = 0; c < 3; c++)
            {
                string label = keys[r, c];
                bool isConfirm = label == "确定";

                var btn = new Button
                {
                    Content = new TextBlock
                    {
                        Text = label,
                        FontSize = label.Length > 1 ? 17 : 26,
                        FontWeight = Microsoft.UI.Text.FontWeights.Black,
                        HorizontalAlignment = HorizontalAlignment.Center,
                    },
                    MinHeight = 68,
                    MinWidth = 68,
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    HorizontalContentAlignment = HorizontalAlignment.Center,
                    VerticalContentAlignment = VerticalAlignment.Center,
                };

                if (isConfirm)
                    btn.Style = (Style)Application.Current.Resources["AccentButtonStyle"];

                string k = label;
                btn.Click += (_, _) =>
                {
                    switch (k)
                    {
                        case "⌫":
                            if (input.Length > 0) input.Length--;
                            Update();
                            break;
                        case "确定":
                            if (input.Length == 0) { Close(null); break; }
                            if (!int.TryParse(input.ToString(), out int v)) { Close(null); break; }
                            Close(Math.Clamp(v, min, max));
                            break;
                        default:
                            if (input.Length < 3 && !(input.Length == 0 && k == "0"))
                            {
                                input.Append(k);
                                Update();
                            }
                            break;
                    }
                };

                Grid.SetRow(btn, r);
                Grid.SetColumn(btn, c);
                pad.Children.Add(btn);
            }
        }

        popup.Closed += (_, _) =>
        {
            if (!tcs.Task.IsCompleted) tcs.TrySetResult(null);
        };

        Update();
        popup.IsOpen = true;

        return await tcs.Task;
    }
}
