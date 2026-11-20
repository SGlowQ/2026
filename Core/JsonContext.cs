using System.Text.Json.Serialization;

namespace WishWinUI.Core;

/// <summary>
/// JSON 序列化的源生成上下文。
/// 用源生成器而不是反射，这样即使以后重新开启裁剪也不会把序列化代码裁掉
/// （之前开 PublishTrimmed 导致设置和抽卡记录全部静默保存失败）。
/// </summary>
[JsonSourceGenerationOptions(
    WriteIndented = true,
    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals)]
[JsonSerializable(typeof(AppSettings))]
[JsonSerializable(typeof(Dictionary<string, WeekState>))]
[JsonSerializable(typeof(WeekState))]
[JsonSerializable(typeof(HistoryRecord))]
[JsonSerializable(typeof(CountdownTarget))]
public sealed partial class JsonContext : JsonSerializerContext
{
}
