# 隐私政策页面部署说明

## 一、这个文件是干什么的

`privacy.html` 是给 **Microsoft Store 审核**用的隐私政策页面。

Store 提交时有一个必填项「隐私政策 URL」，没有这个会直接被拒。你之前在这个 GitHub Pages 站点（`https://sglowq.github.io/2026/`）部署过网页版倒计时，把隐私政策页面放进去最合适。

---

## 二、部署步骤

### 1. 找到你本地这个仓库的目录

你的 GitHub Pages 仓库大概率叫 `2026`，本地路径可能是：

```
E:\...\2026\
├── index.html          ← 网页版倒计时（已有）
├── resource\
│   ├── favicon.png
│   └── 2026.png
└── privacy.html        ← 要加的
```

### 2. 把 `privacy.html` 复制进去

把生成的 `privacy.html` 放在 **`index.html` 同一层**（仓库根目录）。

### 3. 提交并推送

```bash
cd 你的2026仓库目录
git add privacy.html
git commit -m "添加隐私政策页面"
git push
```

### 4. 等 1~2 分钟

GitHub Pages 会自动构建。然后访问验证：

```
https://sglowq.github.io/2026/privacy.html
```

能正常打开就成功了。

---

## 三、填到 Microsoft Store

在 Partner Center 的「属性」或「商店列表」页面找到：

```
隐私政策 URL *
```

填入：

```
https://sglowq.github.io/2026/privacy.html
```

---

## 四、页面内容说明

页面里写了 9 个部分：

| 章节 | 内容 |
| --- | --- |
| 一 | 收集什么信息 —— **什么也不收集** |
| 二 | 数据保存在哪 —— `%AppData%\WishLamp\WishCountdown` |
| 三 | 网络访问 —— 一言、网络时间两个可选功能，列出具体域名 |
| 四 | 数据共享 —— 不卖给任何第三方 |
| 五 | 儿童隐私 —— 教室场景，无注册无收集 |
| 六 | 申请的权限 —— runFullTrust + internetClient |
| 七 | 用户控制权 —— 关闭联网 / 删除数据 / 卸载 |
| 八 | 政策变更说明 |
| 九 | 联系方式 |

**页面特性：**
- 自动跟随系统深色/浅色主题
- 手机端自适应
- 纯静态，无任何外部依赖（不加载字体、图片、脚本）
- 加载速度快

---

## 五、你需要改的地方

页面里有两处写死的链接，确认一下对不对：

**第九节联系方式：**
```html
<li>GitHub：<a href="https://github.com/sglowq">github.com/sglowq</a></li>
<li>项目主页：<a href="https://sglowq.github.io/2026/">sglowq.github.io/2026</a></li>
```

如果你的 GitHub 用户名不是 `sglowq`，改成正确的。

---

## 六、可选：在主页加个入口

如果想让网页版倒计时的用户也能看到隐私政策，可以在 `index.html` 底部加一行：

```html
<a href="privacy.html" target="_blank">隐私政策</a>
```

不影响 Store 提交，纯属方便。

---

## 七、文件位置

```
E:\VS\WindowsProject1\2026-main\2026-main\
├── privacy.html              ← 复制这个到你的 2026 仓库
└── 隐私政策部署说明.md         ← 本文件
```

---

## 八、页面效果预览

在本地直接双击 `privacy.html` 就能用浏览器看效果，不用等部署。
