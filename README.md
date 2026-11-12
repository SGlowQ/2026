# 祈愿与倒计时

一款面向教室场景的 Windows 桌面小工具：**抽卡式随机点名 + 春节倒计时**。

使用 **WinUI 3** 原生开发，界面参照 Windows「设置」——左侧导航、云母材质（Mica）、圆角卡片、Fluent 控件。

> [![Microsoft Store](https://img.shields.io/badge/Microsoft%20Store-祈愿与倒计时-blue?logo=microsoft)](https://apps.microsoft.com/detail/9PF3KCM4KN1B)

## 功能

### 倒计时

- 天 / 时 / 分 / 秒 / 毫秒实时倒计时
- 目标自动跟随下一个春节（自动计算农历，带天干地支年份名）
- 可保存多个自定义目标（考试、生日等），随时切换
- 一言（hitokoto.cn）每分钟刷新，带打字机特效与流动彩虹渐变
- 网络时间校准，优先使用毫秒级高精度授时接口

### 祈愿（随机点名）

- 名单自动按 **五星 : 四星 : 三星 ≈ 1 : 8 : 53** 划分角色池
- 单抽 / 十连，结果卡片显示在按钮右侧
- 五星 / 四星双保底进度条，真实还原抽卡概率
- **十连时 0.5 秒内连点两次「继续」，一键跳过剩余结果**（跳过时卡片显示「已跳过」）
- 「捕获明光」机制
- 最近中奖显示 10 条，按窗口宽度自动换行

### 历史记录

- 按 ISO 周隔离，永久保留
- 可切换查看任意一周，每 5 条一页
- **点页码弹出数字小键盘**，直接输入跳转（适配触屏黑板）
- 导出本周或全部历史（Excel / CSV / TXT）

### 名单

- 粘贴或导入 TXT（一行一个名字，至少 10 个）
- **导入时自动识别文件名作为分组名**，导出时也用分组名作文件名
- 支持多个名单分组（比如「1班」「2班」）随时切换
- 「整理」去空行去重、「排序」按名字排序

### 统计

- 星级分布用**圆环图**展示，三段弧长 = 各星级次数占总抽数的比例
- 全部历史的真实出货率、平均保底抽数、UP 命中率、捕获明光次数
- 与理论概率对比

### 关于

- 数据位置（可更改 / 恢复默认）
- 偏好设置（一言开关、网络时间开关、主题切换）
- 分类清除数据
- 备份与恢复
- 可折叠的详细说明

## 抽卡规则

| 项目 | 说明 |
| --- | --- |
| 五星 | 0.6%，第 74 抽起逐步提升，第 90 抽必出 |
| 四星 | 5.1%，连续 9 抽没有则第 10 抽必出 |
| 三星 | 94.3% |
| UP | 出五星/四星时 50% 为当期 UP，未中则下次必中 |
| 捕获明光 | 五星 UP 与非 UP 交替累计 3 次后触发，下次五星必为 UP |
| 周重置 | 记录与保底状态按 ISO 周隔离，每周一 00:00 重置 |

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl` + `1` ~ `6` | 切换页面 |
| `Ctrl` + `Enter` | 抽一次 |
| `Ctrl` + `Shift` + `Enter` | 连抽十次 |

## 数据存储

所有数据仅保存在本机，不上传任何服务器。

默认位置：

```
%AppData%\WishLamp\WishCountdown\
├── settings.json   ← 名单、倒计时目标、开关设置、自定义数据目录
└── history.json    ← 按周保存的抽卡记录与保底状态
```

可以在「关于」页点「打开文件夹」直接查看，或更改到其他位置。

如果设置保存失败，原因会记录在 `%AppData%\WishLamp-save-error.log`。

## 技术栈

- **.NET 10** / **WinUI 3**（Windows App SDK 2.6.5）
- 单文件自包含发布，自带 .NET 运行时与 Windows App SDK
- 支持 **x64** 与 **ARM64**
- 系统要求：**Windows 10 1809（Build 17763）** 及以上

## 工程结构

```
.
├── App.xaml(.cs)              ← 启动入口：读设置、建存储与引擎、开主窗口
├── MainWindow.xaml(.cs)       ← 左侧导航、页面缓存、窗口位置记忆、快捷键
├── SingleInstance.cs          ← 防多开（命名互斥体）
├── Core/                      ← 核心逻辑（无界面依赖）
│   ├── GachaEngine.cs         ← 抽卡引擎（概率、保底、UP、捕获明光）
│   ├── CharacterPool.cs       ← 角色池划分与本期 UP
│   ├── SpringFestival.cs      ← 农历春节计算
│   ├── CountdownTarget.cs     ← 倒计时目标
│   ├── HistoryStore.cs        ← 按周存档
│   ├── AppSettings.cs         ← 设置与名单分组
│   ├── JsonContext.cs         ← JSON 源生成器
│   └── Models.cs              ← 数据模型与配色
├── Views/                     ← 六个页面
│   ├── CountdownPage.xaml     ← 倒计时（默认启动页）
│   ├── WishPage.xaml          ← 祈愿
│   ├── HistoryPage.xaml       ← 历史记录
│   ├── StatsPage.xaml         ← 抽卡统计
│   ├── RosterPage.xaml        ← 名单与角色池
│   ├── AboutPage.xaml         ← 关于
│   ├── NumberPad.cs           ← 触屏数字小键盘
│   ├── DonutChart.cs          ← 星级分布圆环图（自绘）
│   └── UiFactory.cs           ← 通用控件构造
├── Services/
│   ├── NetworkTime.cs         ← 网络时间同步
│   ├── OnlineContent.cs       ← 一言获取
│   ├── ExcelExporter.cs       ← 手搓 xlsx 导出
│   ├── IcoLoader.cs           ← 从 ico 提取图标帧
│   ├── FontHelper.cs          ← 运行时统一字体
│   └── UiHelpers.cs           ← 颜色与淡入动画
├── Styles/
│   └── ThemeResources.xaml    ← 字体、卡片样式
├── Assets/
│   ├── Fonts/                 ← 鸿蒙字体（Light / Regular / Black）
│   ├── AppIcon.ico
│   └── *.png                  ← 商店图标
├── Package.appxmanifest       ← MSIX 清单
├── setup-x64.iss              ← Inno Setup 安装包脚本（x64）
├── setup-arm64.iss            ← Inno Setup 安装包脚本（ARM64）
├── LICENSE-中文.txt           ← 安装向导显示的中文许可协议
├── WishWinUI.csproj           ← 绿色版（非打包）
└── WishWinUI.Msix.csproj      ← Store 安装包
```

## 构建

需要安装 **.NET SDK 10**。

```bash
# 克隆
git clone https://github.com/SGlowQ/2026.git
cd 2026

# 调试运行
dotnet run --project WishWinUI.csproj -c Debug
```

### 绿色版（单文件自包含）

x64 和 ARM64 各出一份：

```powershell
# x64（约 108 MB）
dotnet publish WishWinUI.csproj -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true -p:WindowsAppSDKSelfContained=true `
  -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o 绿色版

# ARM64（约 107 MB）
dotnet publish WishWinUI.csproj -c Release -r win-arm64 --self-contained true `
  -p:PublishSingleFile=true -p:WindowsAppSDKSelfContained=true `
  -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true `
  -p:Platform=ARM64 -o 绿色版-arm64
```

> 发布后需把 `Assets` 文件夹复制到输出目录下（任务栏图标依赖它）。

### 安装包（Inno Setup）

安装包用**多文件发布**（启动比单文件快），再由 Inno Setup 打包。x64 和 ARM64 各出一个独立安装包：

```powershell
# 1. 多文件发布（两种架构各一份）
dotnet publish WishWinUI.csproj -c Release -r win-x64 --self-contained true `
  -p:WindowsAppSDKSelfContained=true -p:PublishSingleFile=false -o 发布

dotnet publish WishWinUI.csproj -c Release -r win-arm64 --self-contained true `
  -p:WindowsAppSDKSelfContained=true -p:PublishSingleFile=false -p:Platform=ARM64 -o 发布-arm64

# 2. 编译安装包（需先装 Inno Setup 6）
$iscc = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
& $iscc setup-x64.iss
& $iscc setup-arm64.iss
```

产物：

| 文件 | 架构 | 大小 |
| --- | --- | --- |
| `安装包输出\祈愿与倒计时_<版本>_安装包_x64.exe` | x64 | 约 77 MB |
| `安装包输出\祈愿与倒计时_<版本>_安装包_ARM64.exe` | ARM64 | 约 74 MB |

安装包特性：可选安装目录、开始菜单/桌面快捷方式、中文许可协议、卸载时保留用户数据。

### 全部产物一览

| 类型 | 文件 | 大小 |
| --- | --- | --- |
| 安装包 x64 | `安装包输出\祈愿与倒计时_<版本>_安装包_x64.exe` | ~77 MB |
| 安装包 ARM64 | `安装包输出\祈愿与倒计时_<版本>_安装包_ARM64.exe` | ~74 MB |
| 绿色版 x64 | `绿色版\祈愿与倒计时.exe` | ~108 MB |
| 绿色版 ARM64 | `绿色版-arm64\祈愿与倒计时.exe` | ~107 MB |
| Store 包 | `商店包\祈愿与倒计时_<版本>_x64_arm64.msixupload` | ~146 MB |

### Store 安装包

两种架构分别发布：

```powershell
dotnet publish WishWinUI.Msix.csproj -c Release -r win-x64 -p:Platform=x64 `
  -p:UapAppxPackageBuildMode=StoreUpload -p:AppxPackageSigningEnabled=false `
  -p:AppxPackageDir="商店包\" -p:PublishTrimmed=false

dotnet publish WishWinUI.Msix.csproj -c Release -r win-arm64 -p:Platform=ARM64 `
  -p:UapAppxPackageBuildMode=StoreUpload -p:AppxPackageSigningEnabled=false `
  -p:AppxPackageDir="商店包\" -p:PublishTrimmed=false
```

把两个 `.msix` 合成一个 bundle（商店只需上传这一个文件）：

```powershell
$makeappx = "$env:USERPROFILE\.nuget\packages\microsoft.windows.sdk.buildtools\10.0.28000.2957\bin\10.0.28000.0\x64\makeappx.exe"

New-Item -ItemType Directory bundle输入 -Force
Copy-Item "商店包\*\*_x64.msix",   "商店包\*\*_arm64.msix" -Destination bundle输入

& $makeappx bundle /d bundle输入 /p "商店包\祈愿与倒计时_<版本>_x64_arm64.msixbundle" /o
Compress-Archive -Path "商店包\祈愿与倒计时_<版本>_x64_arm64.msixbundle" -DestinationPath 商店包\tmp.zip
Move-Item 商店包\tmp.zip "商店包\祈愿与倒计时_<版本>_x64_arm64.msixupload"
```

上传 `祈愿与倒计时_<版本>_x64_arm64.msixupload`（约 146 MB）到 Partner Center 即可。

## 关于代码签名

本项目的 exe **没有商业代码签名证书**，所以首次运行时 Windows 可能提示「未知发布者」。

原因是个人开发者无法申请代码签名证书：需要企业营业执照，且年费在 1500–6000 元。点「更多信息 → 仍要运行」即可正常使用。从 Microsoft Store 安装则不会有此提示（商店负责签名）。

## 字体

界面统一使用 **HarmonyOS Sans SC**（鸿蒙字体），只打包三个字重：

| 文件 | 字重 | 用途 |
| --- | --- | --- |
| `harmony-light.ttf` | 300 | 副标题、说明、小字号 |
| `harmony-regular.ttf` | 400 | 正文 |
| `harmony-black.ttf` | 900 | 标题、按钮、数字 |

> 字体约 23.6 MB，占仓库体积的绝大部分。如果嫌弃仓库太大，可以把 `Assets/Fonts` 移出仓库，改为引用系统已安装的 HarmonyOS Sans SC（未安装时回退系统默认字体）。

字体版权归 Huawei / HarmonyOS 所有，仅作界面显示用途。

## 版本号规则

格式 `a.b.c.d`，**最后一位 `d` 必须为 `0`**（Store 保留位）：

| 场景 | 示例 |
| --- | --- |
| 修 bug | `2.0.1.0` → `2.0.2.0` |
| 加功能 | `2.1.0.0` |
| 大改版 | `3.0.0.0` |
| ❌ 禁用 | `2.0.2.1` |

改版本号要同步这些地方：

- `Package.appxmanifest` 的 `<Identity Version>`
- 两个 `.csproj` 的 `<Version>` 和 `<FileVersion>`
- `setup-x64.iss` / `setup-arm64.iss` 的 `#define MyAppVersion`
- `docs/index.html` 里的版本徽章

## 说明

- 本项目不含任何原神（Genshin Impact）素材，元素图标使用系统 Emoji
- 默认名单为空，首次使用需自行导入名单，不会预置任何示例数据
- 隐私政策：https://sglowq.github.io/2026/privacy.html

## 关于本项目：一次 Vibe Coding 实验

说实话，这个项目是**在氛围编程（Vibe Coding）的状态下做出来的**。

整个过程大致是：描述想要什么 → 让 AI 生成 / 修改代码 → 跑一下看效果 → 不对就继续说。没有画 UML，没有先设计接口，很多时候连下一行要写什么都还没想好。

### 结果是真实的

| 好的部分 | 不太好的部分 |
| --- | --- |
| 从零到能在 Store 上架，用时很短 | 有些改动是"先改了再说"，后来发现方向不对又回退 |
| 界面迭代特别快，想调哪里说一声就行 | 删个按钮把自己搞崩过好几次（XAML 增量编译缓存坑） |
| 遇到不熟悉的 API（Win32、XAML 布局）也能推进 | 一度下了错误判断，把环境问题当成代码 bug |

### 踩过的坑，都留在这里了

这份源码里有不少**看起来莫名其妙的注释**，比如：

```csharp
// 注意：不能用 AppWindow.Resize 来"纠偏"，因为 Resize 会重新布局窗口位置，
// 用户拖动边角时窗口就会往左上角跑。这里用 WM_GETMINMAXINFO 让系统自己限制。
```

```csharp
// FontIcon / SymbolIcon 靠 Segoe Fluent Icons 的字形显示图标，字体绝不能替换，
// 否则图标会变成空白（导航图标、提示条的 √ 勾、按钮图标都会没）
```

这些都是**真踩过才写下的**。AI 不会主动告诉你"这样会崩"，只能崩了再回头补。

### 想对看到这里的人说

**AI 能极大加速开发，但不能替你判断。** 它可以把代码写得像模像样，却无法保证：

- 这个功能真的是用户要的
- 这个改动真的解决了问题，而不是换了个地方崩
- 这段逻辑在边界情况下是否还成立

所以如果你也在用 AI 写代码，建议：

1. **每改一处，立刻验证一处** —— 别攒十几个改动一起测，出了问题根本不知道是哪里的
2. **相信截图和日志，不要相信推测** —— 这一路有好几次"我觉得是 A 的问题"，结果验证发现是 B
3. **保留回退能力** —— 改动前确认能还原，比什么优化都实在
4. **让 AI 解释"为什么"** —— 光要结果，下次还会犯同样的错

这个项目不完美，但它是真实的——包括那些弯的、绕的、回退过的部分。

---

## License

[MIT](LICENSE)
