; 祈愿与倒计时 安装包脚本
; 用 Inno Setup 6 编译：ISCC.exe setup.iss

#define MyAppName "祈愿与倒计时"
#define MyAppVersion "2.1.5.0"
#define MyAppPublisher "Sglowq"
#define MyAppExeName "祈愿与倒计时.exe"
#define MyAppURL "https://github.com/SGlowQ/2026"

[Setup]
; 应用唯一标识，升级时保持不变
AppId={{8F3A2C71-4B9E-4D62-A1F5-7C8E9D0B3A46}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; 默认装到 Program Files，安装时可以点「浏览…」改成任意位置
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; 显示安装目录选择页，允许自由改路径
DisableDirPage=no
; 升级安装时沿用上次选择的目录
UsePreviousAppDir=yes
; 允许装到不是空白的已有目录（例如 D:\Tools\祈愿与倒计时）
AllowNoIcons=yes

; 许可协议（中文版，附英文原文）
LicenseFile=LICENSE-中文.txt

; 输出
OutputDir=安装包输出
OutputBaseFilename=祈愿与倒计时_{#MyAppVersion}_安装包_x64
SetupIconFile=Assets\AppIcon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern

; 只支持 64 位 x64 的 Windows 10/11
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763

; 需要管理员权限（装到 Program Files）
PrivilegesRequired=admin

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:"; Flags: unchecked

[Files]
; x64 版完整文件
Source: "发布\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; 许可与说明
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE-中文.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
