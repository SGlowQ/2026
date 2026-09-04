// 必应每日一图 API 地址，无需鉴权，直接返回当天高质量壁纸图片
const WALLPAPER_API = 'https://uapis.cn/api/v1/image/bing-daily';

/**
 * 将必应每日一图设置为页面背景
 * - 获取页面中 id="bg" 的 DOM 元素作为壁纸容器
 * - 把 API URL 以 CSS url() 形式赋给 backgroundImage
 * - 浏览器会自动发起请求加载并渲染图片
 * 如果容器不存在则安全退出，避免空指针报错
 */
function applyWallpaper() {
    // 查找承载壁纸的 DOM 容器（id 为 "bg"）
    const wallpaper = document.getElementById('bg');
    // 防御性校验：元素不存在则直接返回，防止后续访问 .style 时报错
    if (!wallpaper) return;
    // 通过内联样式将背景图片设置为 API 地址，浏览器自动处理跨域和图片解码
    wallpaper.style.backgroundImage = `url("${WALLPAPER_API}")`;
}

applyWallpaper();

// ====== 网络时间同步逻辑开始 ======
// 背景：用户本地设备时间可能不准（手动改了时区、系统时钟漂移等），
// 会导致倒计时、每周保底重置等功能出现偏差。
// 解决方案：启动时请求一次权威网络时间，计算出「服务器时间 - 本地时间」的偏移量，
// 之后所有业务逻辑一律通过 getNetworkNow() 取时间，与本地时钟解耦。

// 核心偏移量：服务器时间 - Date.now()，单位毫秒
// 为 0 表示未同步或同步失败，直接使用本地时间
let timeOffset = 0;
// 就绪标志：网络时间获取完成（无论成功还是失败 fallback）后才会置为 true
// 下游功能（如 updateCountdown）会在就绪前跳过执行，避免出现「时间为 0」的空白
let networkTimeReady = false;

/**
 * 获取当前"网络时间"的毫秒时间戳
 * 调用方统一使用此函数代替 Date.now()，从而与本地时钟解耦
 * @returns {number} 网络时间戳（毫秒）
 */
function getNetworkNow() {
    return Date.now() + timeOffset;
}

/**
 * 获取当前"网络时间"的 Date 对象形式，便于做日期运算
 * @returns {Date} 基于网络时间构建的 Date 实例
 */
function getNetworkDate() {
    return new Date(getNetworkNow());
}

// ===== 发起异步请求，从 RapidAPI world-time-api 拉取服务器时间 =====
const xhr = new XMLHttpRequest();
// 允许跨域请求时携带凭证（Cookie、Authorization 等）；RapidAPI 这里主要是为了兼容
xhr.withCredentials = true;

// 监听请求状态变化；readystatechange 会触发多次，只在 readyState === DONE 时处理结果
xhr.addEventListener('readystatechange', function () {
    if (this.readyState === this.DONE) {
        console.log('API返回内容:', this.responseText); // 调试用：开发时可在控制台看到原始响应

        // 尝试从纯文本响应中用正则提取时间字段
        // API 返回格式示例：
        //   datetime: 2026-09-04T12:34:56.789012+08:00
        // 或兼容旧字段：
        //   utc_datetime: 2026-09-04T04:34:56.789012+00:00
        // 正则解释：^ 行首匹配，^\s* 跳过冒号前的内容，(.+)$ 捕获冒号后的时间字符串
        // 'm' 多行模式使 ^ 和 $ 能匹配每行的开头/结尾
        let match = this.responseText.match(/^datetime:\s*(.+)$/m);
        if (!match) {
            match = this.responseText.match(/^utc_datetime:\s*(.+)$/m);
        }

        // 分支一：正则匹配失败 → 响应格式不符合预期
        if (!match) {
            alert('无法提取时间信息。已使用本地时间作为替代。');
            // 标记就绪，偏移量保持 0 → 相当于 fallback 到本地时间
            networkTimeReady = true;
            timeOffset = 0;
            // 触发所有依赖时间的初始化函数（使用 && 短路求值，防止函数未定义时报错）
            updateCountdown && updateCountdown();
            updateUPDisplay && updateUPDisplay();
            generateScrollingNames && generateScrollingNames();
            updatePityDisplay && updatePityDisplay();
            updateLotteryBtnText && updateLotteryBtnText();
            return;
        }

        // 分支二：提取到了时间字符串，尝试解析为时间戳
        const serverTimeStr = match[1].trim();
        const serverTime = new Date(serverTimeStr).getTime();

        // 解析结果为 NaN → 浏览器无法识别该时间字符串格式
        if (isNaN(serverTime)) {
            alert('无法解析时间信息。已使用本地时间作为替代。');
            networkTimeReady = true;
            timeOffset = 0;
            updateCountdown && updateCountdown();
            updateUPDisplay && updateUPDisplay();
            generateScrollingNames && generateScrollingNames();
            updatePityDisplay && updatePityDisplay();
            updateLotteryBtnText && updateLotteryBtnText();
            return;
        }

        // 分支三：解析成功，计算偏移量并就绪
        // 关键公式：偏移 = 服务器权威时间 - 当前本地时间
        // 之后任意时刻的「网络时间」= Date.now() + timeOffset
        timeOffset = serverTime - Date.now();
        networkTimeReady = true;
        // 同步成功后同样需要触发下游初始化，因为它们之前一直被 networkTimeReady 挡着
        updateCountdown && updateCountdown();
        updateUPDisplay && updateUPDisplay();
        generateScrollingNames && generateScrollingNames();
        updatePityDisplay && updatePityDisplay();
        updateLotteryBtnText && updateLotteryBtnText();
    }
});

// 配置并发送 HTTP 请求
xhr.open('GET', 'https://world-time-api3.p.rapidapi.com/ip.txt');
// RapidAPI 鉴权头：所有请求必须携带这两个 header 才能通过 API 网关
xhr.setRequestHeader('x-rapidapi-key', '321cc957b9msh51719babd0797e6p16a1d0jsn19a6f50ea3b0');
xhr.setRequestHeader('x-rapidapi-host', 'world-time-api3.p.rapidapi.com');
// 发送请求；注意这是异步的，函数不会阻塞，上面的回调在数据返回后才执行
xhr.send();
// ====== 网络时间同步逻辑结束 ======

/**
 * 点名展示栏展开 / 收起逻辑
 * 监听 DOMContentLoaded 是因为脚本在 <head> 中加载，此时 DOM 树尚未构建完成，
 * 直接 getElementById 会拿到 null；等 DOM 就绪后再绑定事件才稳妥。
 */
document.addEventListener('DOMContentLoaded', function () {
    // 获取切换按钮和展示栏两个关键 DOM 元素
    var btn = document.getElementById('toggleNamesBtn');
    var names = document.getElementById('scrollingNames');
    // 防御性校验：页面上存在这两个元素时才绑定点击事件，避免 DOM 缺失时报错
    if (btn && names) {
        btn.onclick = function () {
            // 判断当前展示栏是否处于隐藏状态
            // 关键：不能用 names.style.display 来判断，因为它只反映内联样式（style 属性里写的），
            // 无法获取 <style> 标签或外部 CSS 文件中的规则；
            // getComputedStyle 会返回元素实际渲染后最终生效的样式值，才是真实状态。
            const isHidden = window.getComputedStyle(names).display === 'none';
            // classList.toggle 的第二个参数是「强制开关」语义：
            //   为 true  → 强制加上 'is-visible'（展开）
            //   为 false → 强制移除 'is-visible'（收起）
            // 这里 isHidden === true 说明当前是收起态 → 点击后应该展开
            names.classList.toggle('is-visible', isHidden);
            // 根据刚才的判断结果，同步更新按钮文案：
            // 当前被判定为"隐藏"意味着即将展开，按钮文案就要提示「收起」，反之亦然
            btn.textContent = isHidden ? '收起展示栏' : '展开展示栏';
        };
    }
});

// 移动端横屏检测与提示

/**
 * 判断当前设备是否为"移动端"
 * 采用**双重检测策略**，避免单一判断方式的局限性：
 *   1. UA 检测：通过 User Agent 字符串匹配主流移动系统关键词（经典方法，但存在被篡改的可能）
 *   2. 能力检测：通过 CSS Media Query 检测是否支持 coarse（粗略指针，即触摸）+ 屏幕宽度 ≤ 1024px
 *      —— 兼容 iPad 桌面模式、UA 伪装等边界情况
 *
 * @returns {boolean} 是移动端返回 true，否则返回 false
 */
function isMobileDevice() {
    // 获取浏览器 UA 字符串；navigator.userAgent 在极端情况（某些隐私模式）下可能为空，
    // 用 || '' 兜底避免 undefined 导致正则 test 报错
    const userAgent = navigator.userAgent || '';
    // 主流移动系统关键词正则
    // 'i' 标志表示忽略大小写，兼容 Android 小写变体等情况
    const mobilePattern = /(Android|iPhone|iPad|iPod|Mobile|Windows Phone)/i;
    // CSS 媒体查询检测：'(pointer: coarse)' 匹配"使用触摸/触控笔等粗略指针设备"
    // 前置 window.matchMedia && 是防御性判断，老浏览器不支持 matchMedia 时短路返回 false
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    // 最终判定逻辑（OR 短路）：
    //   - UA 命中 → 直接认定为移动端
    //   - 或者：支持触摸 + 屏幕宽度 ≤ 1024px → 也认定为移动端
    //     （这里用 1024 是 iPad mini 横屏的宽度，兼顾平板场景）
    return mobilePattern.test(userAgent) || (coarsePointer && window.innerWidth <= 1024);
}

/**
 * 判断当前屏幕是否处于"竖屏"方向
 *
 * 判断依据：视口高度 >= 视口宽度
 *   - 高度 >= 宽度 → 竖屏（手机默认持握方向）
 *   - 高度 < 宽度  → 横屏（手机旋转 90° 后的方向）
 *   - 高度 == 宽度 → 正方形屏幕（极少出现，通常视作竖屏处理）
 *
 * 注意：window.innerHeight / innerWidth 取的是**视口（viewport）**尺寸，
 * 不是整个屏幕物理分辨率，也不包含浏览器地址栏、侧边栏等 UI 部分。
 *
 * @returns {boolean} 竖屏返回 true，横屏返回 false
 */
function isPortraitMode() {
    // 视口的可视高度 >= 可视宽度 → 竖屏
    return window.innerHeight >= window.innerWidth;
}

/**
 * 更新"请横屏使用"提示条的显示状态
 *
 * 显示条件：必须同时满足 ——
 *   1. 当前是移动端（isMobileDevice）
 *   2. 当前是竖屏方向（isPortraitMode）
 *
 * 也就是说：只有移动端用户竖屏持握时才提示旋转，
 *           横屏了、或者本来就是桌面端，都自动隐藏提示。
 *
 * 触发时机：resize / orientationchange / DOMContentLoaded（见下方三个事件监听）
 */
function updateMobileLandscapeTip() {
    // 获取提示条 DOM 元素（id="mobile-landscape-tip"）
    const tip = document.getElementById('mobile-landscape-tip');
    // 防御性校验：页面上没有提示条元素则直接退出
    if (!tip) return;

    // 综合判定：两个条件同时满足才显示，利用 && 短路求值节省一次不必要的方向检测
    const shouldShow = isMobileDevice() && isPortraitMode();
    // 用 classList.toggle 带第二参数的"强制开关"语义：
    // shouldShow 为 true → 加上 'show' 类（CSS 控制显现）
    // shouldShow 为 false → 移除 'show' 类（CSS 控制隐藏）
    tip.classList.toggle('show', shouldShow);
}

// 三个触发入口，覆盖"用户旋转设备"、"窗口尺寸改变"、"页面初次加载"三种场景：
// 1. resize：窗口大小变化（桌面端拖拽、移动端分屏模式等）
window.addEventListener('resize', updateMobileLandscapeTip);
// 2. orientationchange：设备方向突变（手机/平板物理旋转 90°），移动端比 resize 更精准
window.addEventListener('orientationchange', updateMobileLandscapeTip);
// 3. DOMContentLoaded：页面首次加载时立即执行一次，确保初始状态正确
document.addEventListener('DOMContentLoaded', updateMobileLandscapeTip);

// 禁止右键
document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

// ===== 高考倒计时目标日期 =====
// 默认高考日期：2026年6月7日 00:00:00，转为毫秒时间戳便于后续时间差计算
const DEFAULT_EXAM_DATE = new Date('June 7, 2026 00:00:00').getTime();

// localStorage 存储自定义日期的 key，用户可以手动改成自己的考试日期
const CUSTOM_EXAM_DATE_KEY = 'customExamDate';

// 优先从 localStorage 读用户自定义的考试日期；
// 如果没有（首次访问），则 fallback 到 DEFAULT_EXAM_DATE
// 用 Number() 包裹是因为 localStorage 存的是字符串，需要转回数字类型
let examDate = Number(localStorage.getItem(CUSTOM_EXAM_DATE_KEY) || DEFAULT_EXAM_DATE);

/**
 * 将 examDate（毫秒时间戳）格式化并更新到页面上的两个显示元素中
 *   - targetDateEl：显示「YYYY年MM月DD日」
 *   - targetTimeEl：显示「HH:mm:ss」
 *
 * 调用时机：初始化时 + 用户通过 setExamDateFromInput 自定义日期后
 */
function updateTargetDateDisplay() {
    // 从 DOM 中获取日期和时间两个显示容器
    const targetDateEl = document.getElementById('targetDate');
    const targetTimeEl = document.getElementById('targetTime');
    // 两个元素任一缺失则快速退出，避免空指针
    if (!targetDateEl || !targetTimeEl) return;

    // examDate 是毫秒时间戳，先还原成 Date 对象才能取年月日时分秒
    const date = new Date(examDate);

    // 拆解各时间字段，同时做"补零"格式化
    const yyyy = date.getFullYear();
    // 关键：JS 的 getMonth() 返回 0-11（0 表示一月），必须 +1 才能得到人类可读的 1-12
    // padStart(2, '0')：如果结果只有一位数（如 7 月），在开头补 '0' 变成 "07"
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    // 用 template literal 拼接中文日期 / 标准时间
    // 使用 textContent 而非 innerHTML：防止输入中含有 HTML 标签被当作脚本执行（XSS 防护）
    targetDateEl.textContent = `${yyyy}年${mm}月${dd}日`;
    targetTimeEl.textContent = `${hh}:${mi}:${ss}`;
}

/**
 * 从用户输入的字符串解析并设置新的高考日期
 *
 * @param {string} newDateValue - 用户输入的日期字符串，例如 "2026-06-07 00:00:00"
 * @returns {boolean} 设置成功返回 true；格式错误返回 false（并弹窗提示用户）
 *
 * 流程：
 *   1. 用 new Date() 尝试解析用户输入
 *   2. 解析失败 → 弹窗提示 + 返回 false
 *   3. 解析成功 → 更新 examDate → 持久化到 localStorage → 刷新页面显示 → 返回 true
 */
function setExamDateFromInput(newDateValue) {
    // 将用户输入的字符串交给 Date 构造器解析
    // JS 的 Date 构造器能识别 ISO 8601、"2026-06-07"、"June 7, 2026" 等多种格式
    const parsed = new Date(newDateValue);
    // 如果输入格式不合法，parsed.getTime() 会返回 NaN
    // 注意：必须用 Number.isNaN(parsed.getTime()) 而不是直接 isNaN(parsed)
    // 因为 isNaN(new Date('invalid')) 会先把 Date 对象转成数字 NaN，结果碰巧也是 true，
    // 但 Number.isNaN 语义更严格，不做类型转换，是 ES6 推荐的写法
    if (Number.isNaN(parsed.getTime())) {
        alert('时间格式不正确，请输入例如：2026-06-07 00:00:00');
        return false;
    }

    // 解析成功，覆盖全局 examDate（毫秒时间戳）
    examDate = parsed.getTime();
    // 写入 localStorage，用户下次访问页面时会自动读取这个自定义日期
    // localStorage 只能存字符串，所以用 String() 转回
    localStorage.setItem(CUSTOM_EXAM_DATE_KEY, String(examDate));
    // 刷新页面上两处显示：目标日期文本 + 倒计时数字
    updateTargetDateDisplay();
    updateCountdown();
    return true;
}

// 更新倒计时
/**
 * 高考倒计时核心函数
 *
 * 工作方式：使用 requestAnimationFrame 做递归循环（通常约 60fps），
 * 每一帧重新计算剩余时间并刷新页面上的倒计时 DOM 元素。
 * 用网络时间（getNetworkNow）而非本地时间，避免用户改了系统时钟导致倒计时偏差。
 *
 * 执行前提：networkTimeReady === true（网络时间同步完成）
 * 执行终止：距离 ≤ 0（考试时间已到，全部归零后停止递归）
 */
function updateCountdown() {
    // 门控：网络时间未就绪时跳过执行，防止 distance 计算基于错误的本地时间
    if (!networkTimeReady) return;

    // 当前时刻（毫秒时间戳，基于网络时间而非本地）
    const now = getNetworkNow();
    // 剩余毫秒数：目标时间 - 当前时间；为负表示考试已过
    let distance = examDate - now;

    // ===== 分支一：考试时间已到，全部归零并停止递归 =====
    if (distance <= 0) {
        document.getElementById('days').innerText = "0天";
        document.getElementById('hours').innerText = "00";
        document.getElementById('minutes').innerText = "00";
        document.getElementById('seconds').innerText = "00";
        document.getElementById('milliseconds').innerText = "000";
        return; // 关键：不再 rAF，倒计时永久停止
    }

    // ===== 分支二：考试未到，拆解剩余毫秒为天/时/分/秒/毫秒 =====
    // 单位换算常量：1 天 = 24 × 60 × 60 × 1000 毫秒
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // 天数：用 toFixed(1) 保留 1 位小数，实现"还剩 32.5 天"的体验
    // 这里的 Math.floor(... * 10) / 10 是为了防止浮点精度问题（避免 toFixed 四舍五入出 32.9999999 这种）
    const days = (Math.floor(distance / MS_PER_DAY * 10) / 10).toFixed(1);

    // 小时：直接用总毫秒除以小时毫秒数取整，不扣除已经算进"天"的部分
    // （即 hours 会超过 24，是"总剩余小时数"的语义）
    const hours = Math.floor(distance / (1000 * 60 * 60));
    // 分钟：用取模运算去掉已经算进"小时"的部分，再除以分钟毫秒数
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    // 秒：去掉已经算进"分钟"的部分
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    // 毫秒：最后剩下的不足 1 秒的部分
    const milliseconds = Math.floor(distance % 1000);

    // ===== 刷新页面上的 5 个 DOM 元素 =====
    document.getElementById('days').innerText =  days + "天";
    document.getElementById('hours').innerText = hours.toString().padStart(2, '0');
    document.getElementById('minutes').innerText = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').innerText = seconds.toString().padStart(2, '0');
    document.getElementById('milliseconds').innerText = milliseconds.toString().padStart(3, '0');

    // 递归调度下一帧：requestAnimationFrame 会在下一次浏览器重绘前执行回调，
    // 比 setInterval 更平滑、也更省电（页面在后台标签时自动降频或暂停）
    requestAnimationFrame(updateCountdown);
}

// ===== 全屏切换功能 =====
const fullscreenBtn = document.getElementById('fullscreen-btn');

// 点击按钮时：当前不在全屏 → 进入全屏；已在全屏 → 退出全屏
fullscreenBtn.addEventListener('click', function () {
    // document.fullscreenElement 返回当前处于全屏的 DOM 元素；无值（null/undefined）表示不在全屏
    if (!document.fullscreenElement) {
        // 让整个页面（<html> 元素）进入全屏模式
        // requestFullscreen() 必须在用户点击等手势触发的回调里调用，否则浏览器会拒绝（安全策略）
        document.documentElement.requestFullscreen();
        // 图标切换为"退出全屏"图标（compress）
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        // 退出全屏：document.exitFullscreen() 退出当前全屏元素
        document.exitFullscreen();
        // 图标切换回"进入全屏"图标（expand）
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
});

// 监听全屏状态变化 —— 比如用户按了 ESC 键手动退出全屏时，
// 上面的 click 事件不会触发，按钮图标就不同步了，这里专门补这种场景
document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
});

// ===== 一言功能 =====
// 计时器句柄：用于后续 clearInterval 停止定时更新
let hitokotoInterval;
// 并发锁：防止上一次请求还没回来时又触发下一次请求（快速连点 / 定时器重叠）
let isUpdating = false;
// 可见性开关：页面被隐藏（如切到后台标签）时可以暂停一言刷新
let isHitokotoVisible = true;

/**
 * 将文本逐字拆分为 <span> 并追加到容器中，每个字会带上：
 *   1. --letter-index 自定义属性（CSS 可用来做逐字动画延迟）
 *   2. 如果 element 是主文本（id="hitokoto"），还会为每个字计算一个渐变色
 *      颜色从 rgb(218,117,255) → rgb(106,130,251) 做线性插值，实现"文字渐变"效果
 *
 * @param {HTMLElement} element - 承载文字的 DOM 容器
 * @param {string} text - 要渲染的文本内容
 */
function renderHitokotoText(element, text) {
    // 清空容器中已有的所有子节点
    element.innerHTML = '';
    // Array.from 能正确处理 emoji 等多字节字符（用 [...text] 同理）
    const characters = Array.from(text);
    // 判断当前渲染的是不是主文本（主文本才有渐变上色，来源行不需要）
    const isMainText = element.id === 'hitokoto';
    // 最后一个字符的索引，用于计算颜色插值进度；至少为 1 防止除零
    const lastIndex = Math.max(characters.length - 1, 1);

    characters.forEach((character, index) => {
        const letter = document.createElement('span');
        letter.className = 'hitokoto-letter';
        // 空格渲染为 \u00a0（不换行空格 &nbsp;），否则浏览器会折叠空白字符导致字间距丢失
        letter.textContent = character === ' ' ? '\u00a0' : character;
        // 将当前字的索引存入 CSS 变量 --letter-index，CSS 可以用它做 stagger（逐字延迟）动画
        letter.style.setProperty('--letter-index', Math.min(index, 8));
        if (isMainText) {
            // progress: 0 → 1，从首字到末字的进度
            const progress = index / lastIndex;
            // 颜色插值公式：起始值 + (目标值 - 起始值) × progress
            // 起始 rgb(218, 117, 255) 偏紫 → 目标 rgb(106, 130, 251) 偏蓝
            const red = Math.round(218 + (106 - 218) * progress);
            const green = Math.round(117 + (130 - 117) * progress);
            const blue = Math.round(255 + (251 - 255) * progress);
            letter.style.color = `rgb(${red}, ${green}, ${blue})`;
        }
        element.appendChild(letter);
    });
}

/**
 * 从 hitokoto.cn 一言 API 获取一条新句子，并带动画地替换页面上的旧句子
 *
 * 动画时序（两阶段过渡）：
 *   Phase 1: 溶解（dissolve）—— 旧文本淡出 + 逐字消失（约 820ms）
 *   Phase 2: 进入（entering）—— 新文本渲染 + 逐字淡入（约 900ms）
 *
 * 总耗时 ≈ 1720ms，期间 isUpdating 为 true，防止并发触发
 */
function updateHitokoto() {
    // 并发锁 + 可见性双重门控：正在更新或页面隐藏时直接跳过
    if (isUpdating || !isHitokotoVisible) return;

    isUpdating = true;
    // 一言 API 免费、无需鉴权，返回 JSON 格式如 { hitokoto: "...", from: "...", from_who: "..." }
    fetch('https://v1.hitokoto.cn')
        .then(response => response.json())
        .then(data => {
            const hitokoto = data.hitokoto || '';
            // 来源用书名号包裹；作者直接拼接在后面
            const from = data.from ? `『${data.from}』` : '';
            const fromWho = data.from_who ? `${data.from_who}` : '';

            const hitokotoElement = document.getElementById('hitokoto');
            const fromElement = document.getElementById('from');
            // 防御性检查：DOM 元素缺失时重置锁并退出
            if (!hitokotoElement || !fromElement) {
                isUpdating = false;
                return;
            }

            // ===== 准备阶段：清除可能残留的动画类 =====
            hitokotoElement.classList.remove('is-entering', 'is-dissolving');
            fromElement.classList.remove('is-entering', 'is-dissolving');

            // ===== 关键技巧：强制 reflow =====
            // void hitokotoElement.offsetWidth 会触发一次"强制同步布局"，
            // 让浏览器立即应用刚才的 remove 操作，确保接下来 add 动画类时
            // CSS Transition 能感知到"从无到有"的状态变化，而不是被合并掉
            void hitokotoElement.offsetWidth;

            // ===== Phase 1: 开始溶解动画（旧文字淡出）=====
            hitokotoElement.classList.add('is-dissolving');
            fromElement.classList.add('is-dissolving');

            // 等待溶解动画结束（820ms 后），开始 Phase 2
            setTimeout(() => {
                // 先把新文字渲染到 DOM（替换掉刚才已溶解的旧内容）
                renderHitokotoText(hitokotoElement, hitokoto);
                renderHitokotoText(fromElement, from + fromWho);

                // 移除溶解类，加入进入类（CSS transition 再次触发）
                hitokotoElement.classList.remove('is-dissolving');
                fromElement.classList.remove('is-dissolving');
                hitokotoElement.classList.add('is-entering');
                fromElement.classList.add('is-entering');

                // Phase 2 进入动画也跑完后（900ms），清除动画类并释放并发锁
                setTimeout(() => {
                    hitokotoElement.classList.remove('is-entering');
                    fromElement.classList.remove('is-entering');
                    isUpdating = false;
                }, 900);
            }, 820);
        })
        .catch(error => {
            // 请求失败（网络断了 / API 挂了）：打印错误并释放锁，不阻塞下一次尝试
            console.error(error);
            isUpdating = false;
        });
}

// ===== 问卷与简介弹窗 =====
// 三个关键 DOM：触发按钮 / 弹窗容器 / 弹窗内关闭按钮
const announcementBtn = document.getElementById('announcement-btn');
const announcementContainer = document.getElementById('announcement-container');
const announcementCloseBtn = document.getElementById('announcement-close-btn');

// 点击"简介/问卷"按钮 → 弹窗打开（CSS 通过 .is-open 控制显示/过渡动画）
announcementBtn.addEventListener('click', function () {
    announcementContainer.classList.add('is-open');
});

// 点击弹窗内部的关闭按钮 → 弹窗关闭
announcementCloseBtn.addEventListener('click', function () {
    announcementContainer.classList.remove('is-open');
});

// 点击弹窗的**遮罩层**（即 container 本身）也能关闭
// 判断依据：e.target === this —— 只有点击事件直接落在 container 自身上（而不是它里面的子元素）时才关闭，
// 这样用户点击弹窗内的内容区域不会误触发关闭
announcementContainer.addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('is-open');
    }
});

/**
 * Fisher-Yates 洗牌算法（亦称 Knuth Shuffle）
 *
 * 算法思想：从数组末尾开始，逐步将"待打乱区"中随机选一个元素换到当前位置，
 * 每换完一个，"待打乱区"就缩小 1，直到所有元素都处理完毕。
 *
 * 时间复杂度 O(n)、空间复杂度 O(1)（不算返回的新数组），且能生成**等概率**的全排列
 * （不同于 Math.random().sort() 那种"随机但分布不均匀"的写法）。
 *
 * @param {Array} array - 原始数组（不会被修改，函数内部先做了拷贝）
 * @returns {Array} 打乱顺序后的新数组
 */
function shuffleArray(array) {
    // 用展开运算符浅拷贝一份，避免直接修改传入的原数组（纯函数思想）
    const newArray = [...array];
    // 从后往前遍历：i 表示"待打乱区"的最后一个位置
    for (let i = newArray.length - 1; i > 0; i--) {
        // 在 [0, i] 区间内随机选一个索引 j（含两端）
        // 这里必须是 i + 1，因为 Math.random() * N 得到 [0, N)，floor 后是 [0, N-1]
        const j = Math.floor(Math.random() * (i + 1));
        // ES6 解构赋值交换两个位置的元素，等价于传统临时变量写法：
        //   const tmp = newArray[i]; newArray[i] = newArray[j]; newArray[j] = tmp;
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ===== 元素图标表（原神七元素）=====
// 每个元素对应一条记录：
//   - char: Unicode 私用区字符（U+E001 ~ U+E007），配合自定义 iconfont / webfont 显示图标字形
//   - className: CSS 类名，用来给图标上色（对应各元素的主题色，比如 pyro 是红橙色）
//
// 七种元素按原神官方顺序排列：火 水 风 雷 草 冰 岩
// 后续 decorateNameWithElement 会从中随机选一个元素给名字加图标点缀
const elementMap = [
    { char: '\ue001', className: 'element-pyro' },    // 🔥 火
    { char: '\ue002', className: 'element-hydro' },   // 💧 水
    { char: '\ue003', className: 'element-anemo' },   // 🌪️ 风
    { char: '\ue004', className: 'element-electro' },  // ⚡ 雷
    { char: '\ue005', className: 'element-dendro' },   // 🌿 草
    { char: '\ue006', className: 'element-cryo' },     // ❄️ 冰
    { char: '\ue007', className: 'element-geo' }       // 🪨 岩
];

// ===== 默认学生名单（60 人）=====
// 当用户没有在页面上自定义名单时，用这份模板作为数据源
// 后续 getActiveStudentNames() 会优先读 localStorage 中的自定义名单，
// 读不到才 fallback 到这里
const DEFAULT_STUDENT_NAMES = [
    "张永沛", "雷俊杰", "陈馨怡", "殷俊强", "郑奎", "李依婷", "王俊楠",
    "贺梦菲", "黄金婷", "兰雨檐", "肖涵", "陈慧丽", "崔雯", "马英宸",
    "阮方钰", "袁卓峰", "徐啟锐", "刘一凡", "李健", "韦南楠",
    "阮心怡", "杨玉艺", "贺鹏城", "刘艺栋", "陈晨", "樊灵",
    "毛振宇", "徐馨", "索俊俊", "陈鑫", "徐一帆", "刘晨阳",
    "吴金昊", "阮玮", "代艳兴", "熊娜", "查钰钒", "赵国彰",
    "程琳琳", "柯贤威", "茹官旺", "毛静雯", "朱治锦", "杨起浩",
    "樵世诚", "熊娅妮", "黄海棠", "程修均", "张维哲", "徐可欣",
    "张钰箐", "夏增婷", "吴昊昊", "周笠", "任鹏飞", "谢昌农",
    "程凯", "朱海英", "黄佳辉", "曹旖诺", "谢易航", "巩玉蓉"
];

/**
 * 给一个名字随机加上一个原神元素图标前缀
 *
 * 处理流程：
 *   1. 清洗输入：把 null/undefined 转成空字符串，再 trim 去掉首尾空白
 *   2. 如果清洗后为空，返回空字符串（调用方会过滤掉）
 *   3. 从 elementMap 中随机选一个元素，拼成 HTML：
 *      <i class="element-icon element-pyro">\ue001</i>张永沛
 *      ↑ 图标字形通过自定义字体渲染，className 决定颜色，后面接纯名字
 *
 * @param {string} name - 原始名字
 * @returns {string} 带图标前缀的 HTML 字符串；输入为空时返回 ''
 */
function decorateNameWithElement(name) {
    // String(name || '')：把 null/undefined 安全转成字符串；trim() 去掉首尾空格
    const cleanName = String(name || '').trim();
    // 防御性退出：空字符串直接返回空，后续 filter(Boolean) 会把它过滤掉
    if (!cleanName) return '';
    // 从 elementMap（7 个元素）中随机选一个
    const randomIndex = Math.floor(Math.random() * elementMap.length);
    const el = elementMap[randomIndex];
    // 返回完整的 HTML：<i> 标签内放图标字形（Unicode 私用区字符），后面接纯净名字
    return `<i class="element-icon ${el.className}">${el.char}</i>${cleanName}`;
}

/**
 * 从 localStorage 读取用户自定义的学生名单
 *
 * 设计了**四层降级兜底**，保证任何异常情况下都返回合法数组：
 *   1. localStorage 里没有 key → 返回空数组
 *   2. JSON 解析失败（格式损坏） → catch 到异常，返回空数组
 *   3. 解析后不是数组（被篡改） → 返回空数组
 *   4. 解析后是数组但含脏数据（空串/null） → map+filter 清洗
 *
 * @returns {string[]} 清洗后的名字数组；永远返回数组，不会抛错
 */
function getCustomNamesFromStorage() {
    // 整个读取过程包在 try 里，防止 JSON.parse 抛 SyntaxError 或隐私模式下 localStorage 抛异常
    try {
        const raw = localStorage.getItem('customStudentNames');
        // key 不存在 → getItem 返回 null，直接返回空数组
        if (!raw) return [];
        // localStorage 只存字符串，JSON.parse 还原成 JS 对象
        const parsed = JSON.parse(raw);
        // 二次校验：防止存储内容被外部篡成非数组（比如改成字符串或对象）
        if (!Array.isArray(parsed)) return [];
        // 清洗：每项转字符串 + 去首尾空格 + 过滤空串/null/false
        return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch (e) {
        // 兜底：JSON.parse 失败（比如用户手动改了 localStorage 里的值）
        return [];
    }
}

/**
 * 将自定义学生名单持久化到 localStorage
 *
 * 与 getCustomNamesFromStorage 形成"写入时清洗 + 读取时清洗"的双重保险：
 *   - 写入前：map 转字符串 + trim 去空格 + filter 过滤空串/null
 *   - 存储格式：JSON 字符串（数组序列化为字符串）
 *
 * @param {Array} list - 任意可迭代的名字列表，会被自动清洗后再存储
 */
function saveCustomNamesToStorage(list) {
    // localStorage 只能存字符串，所以先 JSON.stringify
    // 写入时做一次清洗，避免脏数据存入（比如空字符串、带空格的名字、null）
    localStorage.setItem('customStudentNames', JSON.stringify(list.map(item => String(item).trim()).filter(Boolean)));
}

/**
 * 获取当前生效的学生名单
 *
 * 优先级：用户自定义名单 > 默认模板
 *   - 如果 localStorage 里有非空的自定义名单 → 返回自定义的
 *   - 否则 → 返回 DEFAULT_STUDENT_NAMES（60 人模板）
 *
 * 这是整个"点名/抽奖"系统的数据源入口，后续会用 .map(decorateNameWithElement)
 * 给名字加元素图标，再分到卡池里。
 *
 * @returns {string[]} 纯净的名字数组，长度永远 > 0
 */
function getActiveStudentNames() {
    // 尝试从 localStorage 读自定义名单（内部已经做了四层容错）
    const customNames = getCustomNamesFromStorage();
    // 三元短路：数组长度为真（非空）就用自定义的，否则兜底用默认模板
    // 这里用 .length 而非直接判断 customNames，是因为即使 getCustomNamesFromStorage
    // 返回了空数组（用户清空了名单），也应该 fallback 到默认模板
    return customNames.length ? customNames : DEFAULT_STUDENT_NAMES;
}

// ===== 全局点名数据初始化 =====
// 1. getActiveStudentNames()：取生效名单（自定义 > 默认 60 人）
// 2. .map(decorateNameWithElement)：给每个名字随机加一个原神元素图标前缀
// 3. .filter(Boolean)：decorate 可能对空名字返回 ''，这里过滤掉 falsy 值
// 最终 students 是一个 ['<i ...>🔥</i>张永沛', '<i ...>❄️</i>陈馨怡', ...] 的数组
let students = getActiveStudentNames().map(decorateNameWithElement).filter(Boolean);

// ===== 卡池权重配置（原神抽卡概率）=====
// 下标 0/1/2 分别对应 5 星 / 4 星 / 3 星
// 权重 [1, 8, 53] 含义：5 星概率 1/(1+8+53) ≈ 1.6%，4 星 ≈ 12.9%，3 星 ≈ 85.5%
// 加起来 62，是为了后续用加权随机分配到三个池
const starPoolWeights = [1, 8, 53];

// 三星卡池容器：键是星级 -1（因为数组权重是 [5星, 4星, 3星]）
// 后续 createStarPools 会根据权重把 names 分配到这三个数组里
let starPools = { 0: [], 1: [], 2: [] };

/**
 * 按原神抽卡概率把学生分到三个星级卡池中
 *
 * 算法分四步：
 *   1. 洗牌 + 元素装饰：打乱输入名单并给每人随机加一个元素图标
 *   2. **最大余数法分配**：先按权重比例算出每个池的"理论人数"取整，
 *      剩余名额按小数部分从大到小依次分配（类似选举席位的汉密尔顿法）
 *   3. **保底修正**：5 星至少 1 人、4 星至少 3 人，不够则从 3 星池调人过来
 *   4. **切片入池**：按最终算出的 counts，把洗牌后的数组顺序切成三段
 *
 * 以 60 人、权重 [1,8,53] 为例：
 *   理论值：5星 ≈ 0.97, 4星 ≈ 7.74, 3星 ≈ 51.29
 *   取整后：0, 7, 51（共 58，剩 2 个名额）
 *   按余数排序：5星(0.97) > 4星(0.74) > 3星(0.29)
 *   分配剩余：+1 给 5星，+1 给 4星 → 1, 8, 51
 *   保底修正：5星=1 ✅, 4星=8 ≥ 3 ✅, 无需调整
 *
 * @param {string[]} names - 纯净的学生名单（无元素图标）
 */
function createStarPools(names) {
    // 洗牌 + 加元素装饰（再装饰一次，保证每次重洗后元素也随机）
    const decoratedNames = shuffleArray(names).map(decorateNameWithElement).filter(Boolean);

    // 权重总和 = 1 + 8 + 53 = 62
    const totalWeight = starPoolWeights.reduce((sum, weight) => sum + weight, 0);

    // 第一步：按比例取整，算出每个池的"基础人数"
    // 60 * 1/62 = 0.97 → floor = 0；60 * 8/62 = 7.74 → floor = 7；60 * 53/62 = 51.29 → floor = 51
    const counts = starPoolWeights.map(weight => Math.floor(decoratedNames.length * weight / totalWeight));

    // 第二步：记录每个池的"小数余数"，用于把剩余名额补给余数最大的池
    const remainders = starPoolWeights.map((weight, index) => ({
        index,      // 池编号（0=5星, 1=4星, 2=3星）
        remainder: decoratedNames.length * weight / totalWeight - counts[index]  // 0.97 / 0.74 / 0.29
    }));

    // 已经分配了 floor 后还剩多少人没分（60 - 0 - 7 - 51 = 2）
    let remaining = decoratedNames.length - counts.reduce((sum, count) => sum + count, 0);

    // 按余数从大到小排序 → [5星(0.97), 4星(0.74), 3星(0.29)]
    remainders.sort((left, right) => right.remainder - left.remainder);
    // 依次给余数最大的池 +1，直到 remaining 归零
    // 这里用 % remainders.length 是为了保险（万一 remaining > 池数量就循环分配）
    for (let index = 0; index < remaining; index++) {
        counts[remainders[index % remainders.length].index]++;
    }

    // 第三步：保底修正 —— 确保 5 星至少 1 人、4 星至少 3 人
    // 权重极低时 5 星可能被分到 0 个（比如 60 人理论值才 0.97），必须兜底
    const minimumCounts = [1, 3, 0];
    for (let index = 0; index < minimumCounts.length; index++) {
        // while 循环：不够就一直从其他池"调人"过来，直到满足或没人可调
        while (counts[index] < minimumCounts[index] && counts.reduce((sum, count) => sum + count, 0) <= decoratedNames.length) {
            // 找一个 donors：自己有富余（count > 保底值）的池，把它的人调一个过来
            const donorIndex = counts.findIndex((count, candidateIndex) => candidateIndex !== index && count > minimumCounts[candidateIndex]);
            if (donorIndex < 0) break;  // 没人富余了，放弃
            counts[donorIndex]--;       // donor 池 -1
            counts[index]++;            // 当前池 +1
        }
    }

    // 第四步：按最终 counts 把洗牌后的数组切成三段，分别装进三个卡池
    let cursor = 0;
    starPools = {
        0: decoratedNames.slice(cursor, cursor += counts[0]),  // 5 星池
        1: decoratedNames.slice(cursor, cursor += counts[1]),  // 4 星池
        2: decoratedNames.slice(cursor)                         // 3 星池（一直到末尾）
    };
    // 同时覆盖全局 students，保证后续点名也是最新洗牌 + 装饰后的列表
    students = decoratedNames;
}

// ===== 页面加载时立即初始化卡池 =====
// 1. getActiveStudentNames()：取生效名单（自定义 > 默认 60 人）
// 2. createStarPools()：洗牌 + 按权重分配到 5/4/3 星三个池
// 这是个刷新调用：会同时修改全局变量 starPools 和 students
createStarPools(getActiveStudentNames());

/**
 * 从数组中**不放回**地随机抽取 count 个元素（抽卡 UP 选择）
 *
 * 算法：每次从剩余池里随机选一个，选完就删掉（splice），确保不会重复选中同一个元素。
 * 本质上是 Fisher-Yates 洗牌的"只取前 N 个"版本，时间复杂度 O(count)。
 *
 * 与 shuffleArray 的区别：
 *   - shuffleArray：洗整个数组，O(n)
 *   - pickUPs：只抽 count 个，O(count)，count << n 时更高效
 *
 * @param {Array} arr   - 候选池（不会被修改，内部先做了浅拷贝）
 * @param {number} count - 要抽多少个（超过 arr.length 也不会报错，抽到空就停）
 * @returns {Array} 抽到的 count 个元素组成的新数组
 */
function pickUPs(arr, count) {
    // 浅拷贝：避免 splice 直接修改传入的原数组（比如 starPools[0]）
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < count; i++) {
        // 从剩余候选中随机选一个索引
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy[idx]);
        // 核心：splice 删除已选中的元素，下一轮就不会再选到它了
        copy.splice(idx, 1);
    }
    return result;
}

// ===== 页面加载时随机抽取 UP 角色 =====
// 五星 UP：优先从 5 星卡池抽 1 人；如果 5 星池为空（极端情况），兜底从全体学生里抽
// pickUPs 返回数组，[0] 取第一个元素；|| 短路实现 fallback
let fiveStarUP = pickUPs(starPools[0], 1)[0] || pickUPs(students, 1)[0];

// 四星 UP：从 4 星卡池抽最多 3 人
// Math.min(3, starPools[1].length) 防止池里人数不足 3 时报错
let fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));

/**
 * 把当前 UP 角色渲染到页面的 #upInfo 容器中
 *
 * 全局变量 fiveStarUP / fourStarUPs 里存的是带图标前缀的 HTML 字符串，例如：
 *   '<i class="element-icon element-pyro">\ue001</i>张永沛'
 * 这里的正则把它拆成两部分：图标 <i> 标签 和 纯文字名字，再分别塞进模板里。
 */
function updateUPDisplay() {
    // 正则拆解带图标的名字字符串：
    //   <i[^>]*>.*?<\/i> 匹配 <i ...> 到 </i> 之间的全部内容（非贪婪匹配）
    // [^>]* 匹配 <i 标签的属性部分（比如 class="element-pyro"）
    // .*? 匹配图标字形（比如 \ue001 或 emoji），用 *? 非贪婪防止跨标签匹配
    const fiveIcon = fiveStarUP.match(/<i[^>]*>.*?<\/i>/)[0];   // 取出 <i> 图标标签
    const fiveText = fiveStarUP.replace(/<i[^>]*>.*?<\/i>/, '');  // 去掉 <i> 标签，留下纯名字

    // 对每个 4 星 UP 做同样的拆解，然后拼成 HTML 片段
    const fourHtml = fourStarUPs.map(n => {
        const icon = n.match(/<i[^>]*>.*?<\/i>/)[0];
        const txt = n.replace(/<i[^>]*>.*?<\/i>/, '');
        return `${icon}<span class="up-name up-name-four">${txt}</span>`;
    }).join('&nbsp;&nbsp;&nbsp;&nbsp;');  // 用 6 个 &nbsp; 做元素间距（替代 flex gap，兼容性更好）

    // 把拼好的完整 HTML 塞进 #upInfo 容器
    document.getElementById('upInfo').innerHTML = `
        <div class="up-line">
            <span class="up-label up-label-five">五星UP：</span>
            ${fiveIcon}
            <span class="up-name up-name-five">${fiveText}</span>
        </div>
        <div class="up-line">
            <span class="up-label up-label-four">四星UP：</span>
            ${fourHtml}
        </div>
    `;
}

// 全局变量：保存一份已打乱顺序的学生名单，供 generateScrollingNames 点名展示栏使用
// 和 createStarPools 里的洗牌是独立的 —— 那次洗牌是为了分卡池，这次洗牌是为了滚动展示
let shuffledStudents = shuffleArray(students);

/**
 * 把所有学生名字渲染到 #scrollingNames 容器里，并启动无缝循环滚动动画
 *
 * 实现"无缝循环"的关键技巧：
 *   1. 名单复制一份拼在后面（doubleList = [...arr, ...arr]）
 *   2. CSS 动画从 0% 滚动到 50% 时，刚好滚完第一份名单
 *   3. 50% → 100% 滚完第二份（内容和第一份完全一样）
 *   4. 动画从 100% 瞬间跳回 0%，用户看不到跳跃，感觉无限循环
 *
 * 同时为每个名字卡片附加"星级"标签（查 starPools 反查该学生在哪个池里）
 */
function generateScrollingNames() {
    const container = document.getElementById('scrollingNames');
    if (!container) return;

    // 清空容器（防止重复调用时名字叠加）
    container.innerHTML = '';

    // 名单翻倍：这是实现无缝滚动的核心 —— 第一份滚完瞬间跳回 0% 时，第二份刚好补上
    const doubleList = [...shuffledStudents, ...shuffledStudents];

    doubleList.forEach(student => {
        const nameElement = document.createElement('div');
        nameElement.className = 'name-item';

        // 反查该学生属于哪个星级池：Object.keys 拿键数组 ['0','1','2']，find 找第一个包含该学生的池
        // 因为 starPools 的每个元素本身就是带 <i> 图标的 HTML 字符串，includes 做的是子串匹配
        const rarityIndex = Object.keys(starPools).find(index => starPools[index].includes(student));
        // 键 '0'/'1'/'2' → 映射到 五星/四星/三星
        const rarityText = ['五星', '四星', '三星'][rarityIndex] || '';

        // 用 data-* 属性存原始名字，方便后续（比如点击抽卡时）通过 dataset 读取
        nameElement.dataset.studentName = student;

        // 渲染：名字 + 星级标签（rarityIndex 用来给 CSS 上色，5星金色、4星紫色等）
        nameElement.innerHTML = `${student}<span class="name-rarity rarity-${rarityIndex}">${rarityText}</span>`;
        container.appendChild(nameElement);
    });

    // 计算卡片总数，用于决定动画滚动时长
    const totalCards = doubleList.length;
    // 每个卡片约 1 秒，至少 20 秒；名单越多滚动越慢，保证每张卡片都能看清
    const duration = Math.max(20, totalCards);
    // 设置无限循环的线性滚动动画，时长由卡片数量动态决定
    container.style.animation = `scroll ${duration}s linear infinite`;
}

// 稀有度配置
// name: 显示的星级标识, color: 卡片背景渐变色, textColor: 文字颜色, chance: 出现概率
const rarityConfig = [
    { name: '⭐⭐⭐⭐⭐', color: 'linear-gradient(90deg,#FFD700,#FFA500)', textColor: '#000', chance: 0.006 }, // 5星 金色传说 - 0.6%
    { name: '⭐⭐⭐⭐', color: 'linear-gradient(90deg,#A259FF,#8F5AFF)', textColor: '#fff', chance: 0.051 }, // 4星 紫色稀有 - 5.1%
    { name: '⭐⭐⭐', color: 'linear-gradient(90deg,#00bfff,#1e90ff)', textColor: '#fff', chance: 0.943 }  // 3星 蓝色普通 - 94.3%
];

// 获取当前是第几周（基于年初第一天所在的周日分组计算）
function getWeekNumber(date = getNetworkDate()) {
    // 获取今年1月1日
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    // 计算今天距年初的天数（1天 = 86400000毫秒）
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    // 向上取整得到周数：已过天数 + 年初第一天的星期偏移量，再除以 7
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay()) / 7);
}

// 生成带周次的存储 key，用于按周隔离本地缓存数据（如本周已抽取名单）
// 例如传入 'drawn' 会返回 'drawn_2026_W36'
function getWeekKey(key) {
    // 获取当前网络日期
    const today = getNetworkDate();
    // 计算今年第几周
    const week = getWeekNumber(today);
    // 拼接格式：传入的 key + 年份 + 周数
    return key + '_' + today.getFullYear() + '_W' + week;
}

// 从 localStorage 读取本周的保底计数（带周次 key，按周自动重置）
function getPity(key, defaultValue = 0) {
    // 拼接本周专属 key（如 totalDraws_2026_W36）
    const weekKey = getWeekKey(key);
    // 从 localStorage 读取值
    const value = localStorage.getItem(weekKey);
    // 有值则转为整数返回，无值则使用默认值
    return value ? parseInt(value) : defaultValue;
}

// 将保底计数写入本周专属的 localStorage key
function setPity(key, value) {
    // 拼接本周专属 key
    const weekKey = getWeekKey(key);
    // 保存到 localStorage
    localStorage.setItem(weekKey, value);
}

// 初始化本周保底计数器（按周自动重置）
let totalDraws = getPity('totalDraws', 0);      // 本周总抽取次数
let fiveStarPity = getPity('fiveStarPity', 0);   // 5星保底计数（抽多少次出5星）
let fourStarPity = getPity('fourStarPity', 0);   // 4星保底计数（抽多少次出4星）

// 大保底状态变量（跨周持久化，不随周重置）
let isGuaranteed5StarUP = localStorage.getItem('isGuaranteed5StarUP') === 'true'; // 5星是否已进入大保底（上次5星非UP）
let isGuaranteed4StarUP = localStorage.getItem('isGuaranteed4StarUP') === 'true'; // 4星是否已进入大保底（上次4星非UP）
let isCaptureLightGuaranteed = localStorage.getItem('isCaptureLightGuaranteed') === 'true'; // 捕获光（定轨）是否保底
let lastFiveStarWasNonUp = localStorage.getItem('lastFiveStarWasNonUp') === 'true'; // 上次出的5星是否为非UP（大保底触发依据）
let captureLightCounter = parseInt(localStorage.getItem('captureLightCounter') || '1', 10); // 捕获光/定轨进度计数（默认1）

// 将布尔值以字符串形式存入 localStorage（因为 localStorage 只存字符串）
function setBooleanStorage(key, value) {
    localStorage.setItem(key, String(value));
}

// 将当前的保底计数、大保底状态同步到页面 DOM 上，供用户直观查看
function updatePityDisplay() {
    // 5星大保底激活条件：普通大保底 或 捕获光（定轨）保底，任意一个满足就算激活
    const fiveStarGuaranteedActive = isGuaranteed5StarUP || isCaptureLightGuaranteed;
    const captureLightElement = document.getElementById('captureLightStatus');
    const captureLightCounterElement = document.getElementById('captureLightCounter');

    // 更新 5星 / 4星 小保底计数显示
    document.getElementById('fiveStarPityCount').innerHTML = fiveStarPity;
    document.getElementById('fourStarPityCount').innerHTML = fourStarPity;
    // 更新大保底激活状态文字
    document.getElementById('fiveStarGuarantee').innerHTML = fiveStarGuaranteedActive ? "已激活" : "未激活";
    document.getElementById('fourStarGuarantee').innerHTML = isGuaranteed4StarUP ? "已激活" : "未激活";

    // 更新捕获光（定轨）状态显示（元素可能不存在，加空判断）
    if (captureLightElement) {
        captureLightElement.innerHTML = isCaptureLightGuaranteed ? "已激活" : "未激活";
        // 激活时给元素添加 is-guaranteed 类，可用于 CSS 高亮
        captureLightElement.classList.toggle('is-guaranteed', isCaptureLightGuaranteed);
    }

    // 更新捕获光进度计数显示（非有限数时兜底为 1）
    if (captureLightCounterElement) {
        captureLightCounterElement.innerHTML = Number.isFinite(captureLightCounter) ? captureLightCounter : 1;
    }

    // 大保底激活时，给对应的 DOM 元素添加高亮类
    document.getElementById('fiveStarGuarantee').classList.toggle('is-guaranteed', fiveStarGuaranteedActive);
    document.getElementById('fourStarGuarantee').classList.toggle('is-guaranteed', isGuaranteed4StarUP);
}

// 祈愿按钮文本显示祈愿次数
function updateLotteryBtnText() {
    lotteryBtn.innerText = `祈愿` + '\n' + `（累计${totalDraws}次）`;
}

// 生成本周抽卡历史记录的 localStorage key（按周隔离，自动重置）
// 例如返回 'gachaHistory_2026_W36'
function getHistoryKey() {
    // 获取当前网络日期
    const today = getNetworkDate();
    // 计算今年第几周
    const week = getWeekNumber(today);
    // 拼接格式：gachaHistory_年份_W周数
    return 'gachaHistory_' + today.getFullYear() + '_W' + week;
}

// 向本周的抽卡历史记录中追加一条新记录
// name: 抽到的名字, rarity: 稀有度索引, isUP: 是否为UP角色, triggeredCaptureLight: 是否触发了捕获光
function addHistoryRecord(name, rarity, isUP, triggeredCaptureLight = false) {
    // 获取本周历史记录的存储 key
    const historyKey = getHistoryKey();
    // 读取已有的历史记录（JSON 数组），不存在则初始化为空数组
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    // 获取当前时间，用于生成日期和时间字符串
    const now = getNetworkDate();
    // 格式化为 YYYY-MM-DD，月份和日期不足两位时前补 0
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    // 使用浏览器本地格式获取时间字符串（如 "14:30:25"）
    const timeStr = now.toLocaleTimeString();

    // 构造新的历史记录对象
    const newRecord = {
        name: name,                         // 抽到的名字
        rarity: rarity,                     // 稀有度（0/1/2 对应 5星/4星/3星）
        isUP: isUP,                         // 是否为UP角色
        triggeredCaptureLight: triggeredCaptureLight, // 是否通过捕获光（定轨）保底获得
        date: dateStr,                      // 日期 YYYY-MM-DD
        time: timeStr                       // 时间 HH:mm:ss
    };

    // 新记录插入数组头部（最新的在最前面）
    history.unshift(newRecord);
    // 写回 localStorage
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// 在滚动名单中高亮显示被抽中的名字，按稀有度索引添加对应的高亮类
// winnerName: 抽中的名字, rarityIndex: 稀有度索引（0=5星, 1=4星, 2=3星）
function highlightWinner(winnerName, rarityIndex) {
    // 第一轮遍历：清除所有卡片上已有的 winner-rarity-* 高亮类
    scrollingNames.childNodes.forEach(el => {
        el.classList.remove('winner-rarity-0', 'winner-rarity-1', 'winner-rarity-2');
    });

    // 第二轮遍历：找到与 winnerName 匹配的卡片，添加对应稀有度的高亮类
    // 通过 data-student-name 属性（对应 el.dataset.studentName）来定位目标元素
    scrollingNames.childNodes.forEach(el => {
        if (el.dataset.studentName === winnerName) {
            el.classList.add(`winner-rarity-${rarityIndex}`);
        }
    });
}

// 祈愿（抽卡）功能的核心 DOM 和状态变量
const lotteryBtn = document.getElementById('lotteryBtn');       // 祈愿按钮元素
const scrollingNames = document.getElementById('scrollingNames'); // 滚动名单容器元素
let isRolling = false;                                           // 是否正在滚动中（防止重复触发）

// 十连抽相关变量
let isTenPullMode = false;                  // 当前是否处于十连抽模式
let longPressTimer = null;                  // 长按时的 setTimeout 定时器引用，用于长按结束时清除
const LONG_PRESS_DURATION = 500; // 长按0.5秒触发十连

// 祈愿按钮的点击/长按事件绑定（同时支持 PC 鼠标和移动端触摸）
// 按下时启动长按计时器，松开时根据是否超时来判定是单抽还是十连抽

// PC：鼠标按下 → 启动长按检测
lotteryBtn.addEventListener('mousedown', function (e) {
    e.preventDefault(); // 防止默认行为（如拖拽、文本选中）
    startLongPress();
});

// 移动端：手指触碰屏幕 → 启动长按检测
lotteryBtn.addEventListener('touchstart', function (e) {
    e.preventDefault(); // 防止默认行为（如页面滚动、双击缩放）
    startLongPress();
});

// PC：鼠标松开 → 结束长按检测，根据结果执行单抽或十连
lotteryBtn.addEventListener('mouseup', function (e) {
    e.preventDefault();
    cancelLongPress();
});

// 移动端：手指离开屏幕 → 结束长按检测，根据结果执行单抽或十连
lotteryBtn.addEventListener('touchend', function (e) {
    e.preventDefault();
    cancelLongPress();
});

// 鼠标按住后拖出按钮区域 → 取消长按，防止用户"划走"时误触发十连
lotteryBtn.addEventListener('mouseleave', function () {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        // 恢复按钮文字
        lotteryBtn.innerText = `祈愿` + '\n' + `（累计${totalDraws}次）`;
        isTenPullMode = false;
    }
});

// 按下时触发：启动一个延时定时器，超时后判定为长按（进入十连模式）
function startLongPress() {
    if (isRolling) return; // 正在滚动中不响应

    // 倒计时 LONG_PRESS_DURATION(500ms) 后，标记为十连模式并提示用户
    longPressTimer = setTimeout(() => {
        isTenPullMode = true;
        lotteryBtn.innerText = '十连抽中...';
    }, LONG_PRESS_DURATION);
}

// 松开时触发：清除长按计时器，根据 isTenPullMode 判定是单抽还是十连
function cancelLongPress() {
    // 先清除定时器（不管有没有超时都要清）
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    if (isRolling) return; // 正在滚动中不响应

    // 定时器已超时 → 长按触发 → 执行十连抽
    if (isTenPullMode) {
        performTenPull();
    }
    // 定时器未超时 → 短按触发 → 执行单抽
    else {
        performSinglePull();
    }
}

// 执行一次单抽
function performSinglePull() {
    if (isRolling) return;   // 防重入
    isRolling = true;        // 加锁

    // 调用 drawOne() 完成随机抽取（内含概率计算、保底更新等逻辑）
    const result = drawOne();

    // 将本次抽取写入本周历史记录
    addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP, result.triggeredCaptureLight);

    // 在滚动名单上高亮显示中奖卡片
    highlightWinner(result.winnerName, result.rarityIndex);

    // 弹出全屏抽卡特效（如金色/紫色粒子动画）
    // onClose 回调在用户关闭特效弹窗时触发，解除锁并更新按钮文字
    showFullEffect(result.winnerName, result.rarityIndex, {
        isCaptureLight: result.triggeredCaptureLight,
        onClose: function () {
            isRolling = false;      // 解锁，允许下一次抽卡
            isTenPullMode = false;  // 重置十连模式标志
            updateLotteryBtnText(); // 刷新按钮上的累计次数
        }
    });
}

// 执行十连抽（一次性抽 10 次，统一结算）
function performTenPull() {
    if (isRolling) return;   // 防重入
    isRolling = true;        // 加锁

    // 先一口气抽完 10 次，全部存入 results 数组
    // 注意：10 次抽取共用同一轮保底状态，抽完后保底已全部更新完毕
    const results = [];
    for (let i = 0; i < 10; i++) {
        results.push(drawOne());
    }

    // 10 条历史记录立即写入（不依赖 UI 展示时机）
    results.forEach(result => {
        addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP, result.triggeredCaptureLight);
    });

    // 依次弹出 10 次的抽卡特效展示
    showTenPullResults(results);
}

// 依次展示十连抽的 10 个特效弹窗，全部看完后统一高亮滚动名单上的中奖卡片
// 采用"串行递归"方式：看完一个关一个，再自动弹下一个，直到 10 个全部看完
function showTenPullResults(results) {
    let currentIndex = 0;   // 当前展示到第几个（0~9）
    lotteryBtn.innerText = '十连抽中...'; // 提示文字

    // 内部递归函数：展示 results[currentIndex]，关闭后回调自己展示下一个
    function showNextResult() {
        if (currentIndex < results.length) {
            const result = results[currentIndex];

            // 无论什么稀有度都弹出特效（只是颜色不同：金色=5星、紫色=4星、蓝色=3星）
            showFullEffect(result.winnerName, result.rarityIndex, {
                isCaptureLight: result.triggeredCaptureLight,
                // 用户关闭当前特效 → 序号 +1 → 递归展示下一个
                onClose: function () {
                    currentIndex++;
                    showNextResult();
                }
            });
        } else {
            // 10 个特效全部展示完毕 → 统一高亮所有中奖卡片 → 收尾（解锁等）
            highlightAllTenPullResults(results);
            finishTenPull();
        }
    }

    // 启动第一次展示
    showNextResult();
}

// 十连抽结束后，统一高亮 10 张中奖卡片（会同时高亮主名单和复制名单中的同名卡片）
function highlightAllTenPullResults(results) {
    // 第一轮：清除所有卡片上的高亮类（防止上次单抽或上轮十连的残留）
    scrollingNames.childNodes.forEach(el => {
        el.classList.remove('winner-rarity-0', 'winner-rarity-1', 'winner-rarity-2');
    });

    // 第二轮：遍历 10 次抽取结果，把对应的卡片全部高亮
    // 注意：滚动名单是双份的（doubleList），同名卡片有两张，都会被高亮
    results.forEach(result => {
        const winnerName = result.winnerName;
        const rarityIndex = result.rarityIndex;

        // 在滚动名单的所有子节点中找到匹配名字的卡片，添加对应稀有度的高亮类
        scrollingNames.childNodes.forEach(el => {
            if (el.dataset.studentName === winnerName) {
                el.classList.add(`winner-rarity-${rarityIndex}`);
            }
        });
    });
}

// 展示全屏抽卡特效弹窗：根据稀有度显示不同颜色的星光、星星、名字特效和音效
// name: 中奖名字（可能带 <i> 元素图标）, rarityIndex: 稀有度索引, options: { onClose, isCaptureLight }
function showFullEffect(name, rarityIndex, options = {}) {
    const { onClose, isCaptureLight = false } = options;
    // 获取特效弹窗中的各个 DOM 元素
    const effectContainer = document.getElementById('wishEffect');           // 整个特效容器
    const goldenLight = effectContainer.querySelector('.golden-light');     // 中心光晕
    const characterName = effectContainer.querySelector('.character-name'); // 名字区域
    const nameText = effectContainer.querySelector('.name-text');           // 名字文字
    const starsElement = effectContainer.querySelector('.stars');           // 星星
    const continueBtn = effectContainer.querySelector('.wish-continue-btn'); // "继续"按钮
    const captureLockMs = 5000;                                             // 捕获明光锁定时间（毫秒）

    // 重置状态：清除上次遗留的 class，只保留基础类
    nameText.className = 'name-text';
    effectContainer.classList.remove('capture-light-mode');

    // 根据稀有度确定配色：color（文字/星星颜色）、stars（星星数量）、lightColor（光晕颜色）
    let color, stars, lightColor;
    if (rarityIndex === 0) {
        color = '#FFD700';                              // 5星 - 金色
        stars = '⭐⭐⭐⭐⭐';
        lightColor = 'rgba(255, 215, 0, 0.8)';
    } else if (rarityIndex === 1) {
        color = '#A259FF';                              // 4星 - 紫色
        stars = '⭐⭐⭐⭐';
        lightColor = 'rgba(162, 89, 255, 0.8)';
    } else {
        color = '#00bfff';                              // 3星 - 蓝色
        stars = '⭐⭐⭐';
        lightColor = 'rgba(0, 191, 255, 0.8)';
    }

    // 设置星星文字和颜色
    starsElement.innerHTML = stars;
    starsElement.style.color = color;

    // 捕获明光（定轨保底出5星）特殊效果：紫金双光交织的渐变光晕
    // 普通 5/4/3 星都是单色径向渐变
    if (isCaptureLight && rarityIndex === 0) {
        effectContainer.classList.add('capture-light-mode');
        goldenLight.style.background = `
            radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,215,0,0.8) 18%, rgba(162,89,255,0.75) 42%, rgba(255,215,0,0.4) 63%, rgba(162,89,255,0.12) 100%)
        `;
        goldenLight.style.boxShadow = '0 0 25px rgba(255,215,0,0.8), 0 0 60px rgba(162,89,255,0.8), 0 0 120px rgba(255,215,0,0.6)';
    } else {
        goldenLight.style.background = `radial-gradient(circle, rgba(255, 255, 255, 0) 0%, ${lightColor} 40%, ${lightColor} 70%)`;
        goldenLight.style.boxShadow = '0 0 30px rgba(255,255,255,0.3)';
    }

    // 播放音效：不同稀有度对应不同的音效文件
    let audioToPlay = null;
    if (rarityIndex === 0) {
        audioToPlay = document.getElementById('fiveStarSound');   // 5星专属音效
    } else if (rarityIndex === 1) {
        audioToPlay = document.getElementById('fourStarSound');   // 4星音效
    } else {
        audioToPlay = document.getElementById('threeStarSound');  // 3星音效
    }

    if (audioToPlay) {
        audioToPlay.currentTime = 0; // 重播时先归零
        audioToPlay.play().catch(error => {
            // 浏览器可能阻止自动播放（如未产生过用户交互），静默处理
            console.log('音频自动播放被阻止，需要用户交互:', error);
        });
    }

    // 解析 name HTML，分离 <i> 元素图标（如元素符号）和纯文本名字
    // 目标：元素符号保持原有颜色，只有纯名字部分应用稀有度特效样式
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = name;

    let elementHTML = '';  // 提取到的 <i> 标签 HTML
    let pureName = name;   // 剥离 <i> 后的纯名字文本

    // 如果 name 中包含 <i> 元素图标，提取出来单独处理
    if (tempDiv.querySelector('i')) {
        elementHTML = tempDiv.innerHTML.match(/<i[^>]*>.*?<\/i>/)[0];
        // 给元素图标加上 effect-element-icon 类（可能有特殊样式）
        elementHTML = elementHTML.replace('class="element-icon', 'class="element-icon effect-element-icon');
        pureName = name.replace(/<i[^>]*>.*?<\/i>/, '');
    }

    // 组装最终显示：元素图标（原色）+ 带稀有度特效类的纯名字文本
    nameText.innerHTML = elementHTML + `<span class="${rarityIndex === 0 ? 'five-star-effect' : rarityIndex === 1 ? 'four-star-effect' : 'three-star-effect'}">${pureName}</span>`;

    // 让特效容器显示出来（添加 active 类触发 CSS 过渡）
    effectContainer.classList.add('active');

    // 下一帧触发动画：光晕展开 + 名字浮现（用 setTimeout 0 确保浏览器先应用 active 的初始状态）
    setTimeout(() => {
        goldenLight.style.animation = 'goldenLightAnimation 1.25s ease-out forwards';
        goldenLight.style.opacity = '1';
        characterName.classList.add('revealed');
    });

    // 设置"继续"按钮的初始状态
    continueBtn.disabled = isCaptureLight;
    continueBtn.style.opacity = isCaptureLight ? '0' : '1';          // 捕获明光时按钮隐藏
    continueBtn.style.cursor = isCaptureLight ? 'not-allowed' : 'pointer';
    continueBtn.title = isCaptureLight ? '捕获明光动画锁定中，请等待 5 秒后再关闭' : '继续';

    // 捕获明光特殊处理：锁定 5 秒，期间无法关闭（让用户完整看完动画）
    if (isCaptureLight) {
        const unlockAt = Date.now() + captureLockMs;
        // 锁定期间的 onclick：超时前点击无效，超时后直接回调 onClose（不清理 UI）
        continueBtn.onclick = function () {
            if (Date.now() < unlockAt) {
                return;
            }
            if (onClose) {
                onClose();
            }
        };
        // 5 秒后解锁按钮，重新绑定正常关闭逻辑（清理动画 + 关闭弹窗 + 回调）
        setTimeout(() => {
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            continueBtn.title = '继续';
            continueBtn.onclick = function () {
                // 清理光晕动画和名字浮现效果
                goldenLight.style.animation = 'none';
                goldenLight.style.opacity = '0';
                characterName.classList.remove('revealed');
                effectContainer.classList.remove('active');

                // 停止所有音效（防止下一次抽卡时叠加上一轮的音效）
                try {
                    var audios = [
                        document.getElementById('fiveStarSound'),
                        document.getElementById('fourStarSound'),
                        document.getElementById('threeStarSound')
                    ];
                    audios.forEach(function (audio) {
                        if (audio) {
                            audio.pause();
                            audio.currentTime = 0;
                        }
                    });
                } catch (e) { }

                if (onClose) {
                    onClose();
                }
            };
        }, captureLockMs);
        return; // 捕获明光分支提前返回，跳过下面的普通按钮绑定
    }

    // 普通关闭按钮逻辑（非捕获明光）
    continueBtn.onclick = function () {
        // 清理光晕动画和名字浮现效果
        goldenLight.style.animation = 'none';
        goldenLight.style.opacity = '0';
        characterName.classList.remove('revealed');
        effectContainer.classList.remove('active');

        // 停止所有音效
        try {
            var audios = [
                document.getElementById('fiveStarSound'),
                document.getElementById('fourStarSound'),
                document.getElementById('threeStarSound')
            ];
            audios.forEach(function (audio) {
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
        } catch (e) { }

        if (onClose) {
            onClose();
        }
    };
}

// 十连抽全部特效展示完毕后的收尾工作：解锁、重置模式标志、刷新按钮文字
function finishTenPull() {
    isRolling = false;      // 解除互斥锁，允许下一次抽卡
    isTenPullMode = false;  // 重置十连模式标志
    updateLotteryBtnText(); // 刷新按钮上的累计次数
}

// 抽卡核心逻辑：一次独立抽取，返回 { winnerName, rarityIndex, isUP, triggeredCaptureLight }
// 流程：确定稀有度 → 确定名字（含 UP/非UP、捕获明光、大保底等机制）→ 持久化所有状态 → 返回结果
function drawOne() {
    // 默认 3 星，后续根据概率/保底重新赋值
    let rarityIndex = 2;
    // 每抽一次，三个计数器全部 +1
    totalDraws++;
    fiveStarPity++;
    fourStarPity++;

    // 5星概率表：73抽及以前固定 0.6%，74抽开始线性递增（每抽 +6%），90抽必出
    function getFiveStarChance(pity) {
        if (pity < 74) return 0.006;  // 73抽及以前：基础概率 0.6%
        // 74~90抽：概率从 6.6% 线性递增到 100%（硬保底）
        const table = {
            74: 0.0660,   // 6.6%
            75: 0.1260,   // 12.6%
            76: 0.1860,
            77: 0.2460,
            78: 0.3060,
            79: 0.3660,
            80: 0.4260,
            81: 0.4860,
            82: 0.5460,
            83: 0.6060,
            84: 0.6660,
            85: 0.7260,
            86: 0.7860,
            87: 0.8460,
            88: 0.9060,
            89: 0.9660,
            90: 1.0000   // 硬保底：必出
        };
        return table[pity] || 1.0;
    }

    const fiveStarChance = getFiveStarChance(fiveStarPity);
    const rand = Math.random();

    // 按优先级从高到低判定稀有度：硬保底 → 4星小保底 → 概率判定5星 → 概率判定4星 → (默认3星)
    if (fiveStarPity >= 90) {
        rarityIndex = 0;       // 5星硬保底（90抽必出）
        fiveStarPity = 0;
        fourStarPity = 0;
    } else if (fourStarPity >= 10) {
        rarityIndex = 1;       // 4星小保底（10抽必出4星及以上）
        fourStarPity = 0;
    } else if (rand < fiveStarChance) {
        rarityIndex = 0;       // 概率判定命中5星
        fiveStarPity = 0;
        fourStarPity = 0;
    } else if (rand < fiveStarChance + rarityConfig[1].chance) {
        rarityIndex = 1;       // 概率判定命中4星（5星概率之上再加4星概率区间）
        fourStarPity = 0;
    }

    // 稀有度确定后立即持久化保底计数到本周 localStorage
    setPity('totalDraws', totalDraws);
    setPity('fiveStarPity', fiveStarPity);
    setPity('fourStarPity', fourStarPity);
    updateLotteryBtnText();

    // 以下变量在三种稀有度分支中分别赋值
    let winnerName = '';
    let isUP = false;
    let triggeredCaptureLight = false;

    // ===================== 5星分支 =====================
    if (rarityIndex === 0) {
        // 读取前置状态，后续判定需要对比"上一发5星"和"这一发5星"的 UP/非UP 交替情况
        const previousWasNonUp = lastFiveStarWasNonUp;   // 上一发5星是否为非UP
        const guaranteedUp = isGuaranteed5StarUP;        // 当前是否处于大保底（上次5星非UP，这次必为UP）
        const captureLightForced = isCaptureLightGuaranteed; // 捕获明光保底是否已锁定
        const fullAlternatingCycleReady = captureLightCounter >= 3; // 交替计数是否已满

        // 机制 1：大保底强制 UP（优先级最高，上次5星非UP则这次必UP）
        if (guaranteedUp) {
            winnerName = fiveStarUP;
            isUP = true;
            isGuaranteed5StarUP = false;
        } else if (captureLightForced) {
            // 机制 2：捕获明光保底（定轨保底），本次 UP 必定触发明光特效
            winnerName = fiveStarUP;
            isUP = true;
            triggeredCaptureLight = true;
            isCaptureLightGuaranteed = false;
            // 捕获明光触发后计数器要恢复为 1，这里先设为 2，让后面统一的计数逻辑再 -1 到 1
            captureLightCounter = 2;
        } else {
            // 普通 5星判定：50% UP / 50% 非UP（从 5星池中排除 UP 后随机）
            const standardFiveStarUpChance = 0.5;

            if (Math.random() < standardFiveStarUpChance) {
                winnerName = fiveStarUP;
                isUP = true;
            } else {
                // 从 5星池中排除 UP 角色，随机选一个非UP
                const candidates = starPools[0].filter(s => s !== fiveStarUP);
                if (candidates.length) {
                    winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                    isUP = false;
                    isGuaranteed5StarUP = true;  // 非UP出了 → 大保底激活，下次5星必为UP
                } else {
                    // 如果没有非UP候选（池子只有UP），直接返回UP
                    winnerName = fiveStarUP;
                    isUP = true;
                }
            }
        }

        // 计数规则：
        // 默认值 1
        // 1) 当前发是 UP，上一发是非 UP：不动
        // 2) 当前发是非 UP，上一发是 UP：+1
        // 3) 当前发是 UP，上一发也是 UP：-1，最低为 0
        // 4) 非 UP -> 非 UP 不属于你定义的“UP / 非 UP 交替循环”，因此不参与计数
        // 5) 触发捕获明光后，计数器必须恢复为 1
        if (isUP && previousWasNonUp) {
            // UP -> 非 UP 的上一个状态，无变化
            isGuaranteed5StarUP = false;
        } else if (!isUP && !previousWasNonUp) {
            // 非 UP -> UP，计数 +1
            captureLightCounter += 1;
            if (captureLightCounter >= 3) {
                isCaptureLightGuaranteed = true;
                captureLightCounter = 1;
            }
            isGuaranteed5StarUP = true;
        } else if (isUP && !previousWasNonUp) {
            // UP -> UP，打断，计数 -1
            captureLightCounter = Math.max(0, captureLightCounter - 1);
            isGuaranteed5StarUP = false;
        }

        // 持久化 5星相关的跨周状态变量（大保底/捕获明光不随周重置）
        lastFiveStarWasNonUp = !isUP;
        setBooleanStorage('isGuaranteed5StarUP', isGuaranteed5StarUP);
        setBooleanStorage('isCaptureLightGuaranteed', isCaptureLightGuaranteed);
        setBooleanStorage('lastFiveStarWasNonUp', lastFiveStarWasNonUp);
        localStorage.setItem('captureLightCounter', String(captureLightCounter));
        // 持久化 5星出了后的小保底归零
        fiveStarPity = 0;
        fourStarPity = 0;

    // ===================== 4星分支 =====================
    } else if (rarityIndex === 1) {
        fourStarPity = 0;  // 出了4星后小保底归零

        // 4星大保底：上次4星是 非UP → 这次必UP（从 4星UP 列表中随机选一个）
        if (isGuaranteed4StarUP) {
            winnerName = fourStarUPs[Math.floor(Math.random() * fourStarUPs.length)];
            isUP = true;
            isGuaranteed4StarUP = false;
        } else {
            // 普通 4星判定：50% UP / 50% 非UP
            if (Math.random() < 0.5) {
                winnerName = fourStarUPs[Math.floor(Math.random() * fourStarUPs.length)];
                isUP = true;
            } else {
                // 从 4星池中排除所有 UP 角色，随机选一个非UP
                const candidates = starPools[1].filter(s => !fourStarUPs.includes(s));
                if (candidates.length) {
                    winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                    isUP = false;
                    isGuaranteed4StarUP = true;  // 非UP出了 → 大保底激活
                } else {
                    // 没有非UP候选，直接返回UP
                    winnerName = fourStarUPs[Math.floor(Math.random() * fourStarUPs.length)];
                    isUP = true;
                }
            }
        }

        // 持久化 4星大保底状态（跨周不重置）
        setBooleanStorage('isGuaranteed4StarUP', isGuaranteed4StarUP);
        localStorage.setItem('isGuaranteed4StarUP', isGuaranteed4StarUP ? 'true' : 'false');
    // ===================== 3星分支 =====================
    } else {
        // 3星直接从 3星池或整个名单中随机选
        const candidates = starPools[2].length ? starPools[2] : students;
        winnerName = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // ===================== 最终：更新 UI + 持久化所有状态 + 返回结果 =====================

    // 把最新保底状态同步到页面显示
    updatePityDisplay();

    // 持久化本周保底计数（带周次 key，按周重置）
    setPity('totalDraws', totalDraws);
    setPity('fiveStarPity', fiveStarPity);
    setPity('fourStarPity', fourStarPity);
    // 持久化跨周大保底/捕获明光状态（不带周次 key，跨周保留）
    setBooleanStorage('isGuaranteed5StarUP', isGuaranteed5StarUP);
    setBooleanStorage('isGuaranteed4StarUP', isGuaranteed4StarUP);
    setBooleanStorage('isCaptureLightGuaranteed', isCaptureLightGuaranteed);
    setBooleanStorage('lastFiveStarWasNonUp', lastFiveStarWasNonUp);
    localStorage.setItem('captureLightCounter', String(captureLightCounter));

    // 返回本次抽取结果（单抽直接用，十连抽循环调用收集结果数组）
    return {
        winnerName,
        rarityIndex,
        isUP,
        triggeredCaptureLight
    };
}

// 历史记录相关功能

// 当前分页索引（从 0 开始）和总页数，showHistory 渲染时初始化
let currentSlide = 0;
let totalSlides = 0;

// 渲染本周抽卡历史记录：从 localStorage 读取 → 按每页 5 条分组 → 构建 DOM 并绑定翻页事件
function showHistory() {
    const historyKey = getHistoryKey();  // 获取本周专属 key
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const slidesContainer = document.getElementById('history-slides');

    // 清空容器，准备重新渲染
    slidesContainer.innerHTML = '';

    // 空记录处理：显示"暂无记录"提示，翻页按钮全部禁用
    if (history.length === 0) {
        slidesContainer.innerHTML = '<div class="no-history">本周暂无祈愿记录</div>';
        document.getElementById('prev-btn').disabled = true;
        document.getElementById('next-btn').disabled = true;
        document.getElementById('history-container').classList.add('is-open');
        return;
    }

    // 计算页数：每页 5 条记录
    totalSlides = Math.ceil(history.length / 5);
    currentSlide = 0;

    // 初始时禁用上一页（在第 1 页），如果只有 1 页则下一页也禁用
    document.getElementById('prev-btn').disabled = true;
    document.getElementById('next-btn').disabled = totalSlides <= 1;

    // 外层循环：每页构建一个 history-group（包含 5 条记录）
    for (let i = 0; i < totalSlides; i++) {
        const group = document.createElement('div');
        group.className = 'history-group';

        // 页头：显示当前页号
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'group-title';
        groupTitle.innerHTML = `第 ${i + 1} 页 / 共 ${totalSlides} 页`;

        groupHeader.appendChild(groupTitle);
        group.appendChild(groupHeader);

        // 内层循环：取 [i*5, (i+1)*5) 范围内的记录（最后一页不足 5 条时用 history.length 截断）
        for (let j = i * 5; j < Math.min((i + 1) * 5, history.length); j++) {
            const record = history[j];
            const item = document.createElement('div');
            item.className = 'history-item';

            // 名字列
            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.innerHTML = record.name;

            // 稀有度/状态列（含 UP 标签、捕获明光标签）
            const raritySpan = document.createElement('span');
            raritySpan.className = 'item-rarity';

            if (record.rarity === 0) {
                raritySpan.classList.add('five-star');
                const captureTag = record.triggeredCaptureLight ? '——捕获明光' : '';
                raritySpan.innerHTML = '五星' + (record.isUP ? ' UP!' : '') + captureTag;
                nameSpan.classList.add('five-star');
            } else if (record.rarity === 1) {
                raritySpan.classList.add('four-star');
                raritySpan.innerHTML = '四星' + (record.isUP ? ' UP!' : '');
                nameSpan.classList.add('four-star');
            } else {
                raritySpan.classList.add('three-star');
                raritySpan.innerHTML = '三星';
                nameSpan.classList.add('three-star');
            }

            // 时间列：日期 + 时分
            const timeSpan = document.createElement('span');
            timeSpan.className = 'item-time';
            timeSpan.innerHTML = (record.date ? record.date : '') + ' ' + record.time;

            item.appendChild(nameSpan);
            item.appendChild(raritySpan);
            item.appendChild(timeSpan);

            group.appendChild(item);
        }

        slidesContainer.appendChild(group);
    }

    // 构建分页控件：上一页 + 跳转输入框 + 跳转按钮 + 下一页
    const pageJumpHTML = `
        <input type="number" id="page-input" class="page-input" min="1" max="${totalSlides}" value="1">
        <button id="jump-btn" class="slider-btn jump-btn">跳转</button>
    `;

    const controls = document.querySelector('.slider-controls');
    controls.innerHTML = `
        <button class="slider-btn" id="prev-btn">
            <i class="fas fa-chevron-left"></i>
        </button>
        ${pageJumpHTML}
        <button class="slider-btn" id="next-btn">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    // 绑定翻页事件
    document.getElementById('prev-btn').onclick = function () {
        goToSlide(currentSlide - 1);
    };
    document.getElementById('next-btn').onclick = function () {
        goToSlide(currentSlide + 1);
    };
    // 跳转按钮：输入页号后点击跳转
    document.getElementById('jump-btn').onclick = function () {
        const val = parseInt(document.getElementById('page-input').value, 10);
        if (val >= 1 && val <= totalSlides) {
            goToSlide(val - 1);  // 用户输入从 1 开始，内部索引从 0 开始，需要 -1
        }
    };
    // 回车直接触发放大跳转
    document.getElementById('page-input').onkeydown = function (e) {
        if (e.key === 'Enter') {
            document.getElementById('jump-btn').click();
        }
    };

    // 初始打开，滑到第 1 页（CSS 用 translateX 实现横向滑动）
    goToSlide(0);
    document.getElementById('history-container').classList.add('is-open');
}

// 横向滑到指定页：用 CSS transform  translateX 实现翻页动画
// index: 目标页索引（0 基）
function goToSlide(index) {
    // 边界保护：越界直接 return
    if (index < 0 || index >= totalSlides) return;

    currentSlide = index;
    const slidesContainer = document.getElementById('history-slides');
    // 每页宽度 100%，滑动 -index*100% 即可翻到目标页
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;

    // 根据当前页位置更新上一页/下一页按钮的禁用状态
    document.getElementById('prev-btn').disabled = currentSlide === 0;
    document.getElementById('next-btn').disabled = currentSlide === totalSlides - 1;

    // 同步跳转输入框的值为当前页号（1 基）
    const input = document.getElementById('page-input');
    if (input) input.value = currentSlide + 1;

    // 同步更新每页顶部的"第 X 页 / 共 N 页"标题
    const allHeaders = document.querySelectorAll('.group-header .group-title');
    allHeaders.forEach((el, idx) => {
        el.innerHTML = `第 ${idx + 1} 页 / 共 ${totalSlides} 页`;
    });
}

// 导出本周抽卡历史记录为 Excel (.xlsx) 文件
// 使用 SheetJS (XLSX) 库在前端直接生成并触发下载
function exportHistoryToExcel() {
    // 读取本周历史记录
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    // 空记录保护
    if (!history.length) {
        alert('当前没有可导出的祈愿记录。');
        return;
    }

    // 把历史记录数组映射为纯文本行对象（列名为中文，Excel 中直接显示为表头）
    const rows = history.map((record, index) => {
        // 名字中可能包含 <i> 元素图标标签，导出前全部剥离为纯文本
        const plainName = (record.name || '')
            .replace(/<i[^>]*>.*?<\/i>/g, '')   // 先移除 <i> 元素图标
            .replace(/<[^>]+>/g, '')             // 再移除任何剩余的 HTML 标签
            .trim();

        return {
            序号: index + 1,
            名称: plainName,
            星级: record.rarity === 0 ? '五星' : record.rarity === 1 ? '四星' : '三星',
            是否UP: record.isUP ? '是' : '否',
            捕获明光是否触发: record.triggeredCaptureLight ? '是' : '否',
            日期: record.date || '',
            时间: record.time || ''
        };
    });

    // SheetJS 三步曲：json_to_sheet → book_new → book_append_sheet
    const sheet = XLSX.utils.json_to_sheet(rows);        // JSON 数组 → 工作表
    const workbook = XLSX.utils.book_new();             // 创建空工作簿
    XLSX.utils.book_append_sheet(workbook, sheet, '祈愿记录');  // 把工作表加入工作簿

    // 文件名格式：祈愿记录_2026-09-04_14-30-52.xlsx（用网络时间，不受用户本地时间篡改影响）
    const exportDate = getNetworkDate();
    const fileName = `祈愿记录_${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, '0')}-${String(exportDate.getDate()).padStart(2, '0')}_${String(exportDate.getHours()).padStart(2, '0')}-${String(exportDate.getMinutes()).padStart(2, '0')}-${String(exportDate.getSeconds()).padStart(2, '0')}.xlsx`;
    // 触发浏览器下载
    XLSX.writeFile(workbook, fileName);
}

// ===== 历史记录相关事件绑定 =====
// 打开/导出历史、关闭弹窗、翻页、点击遮罩层关闭
document.getElementById('history-btn').addEventListener('click', showHistory);
document.getElementById('export-btn').addEventListener('click', exportHistoryToExcel);
document.getElementById('close-btn').addEventListener('click', function () {
    document.getElementById('history-container').classList.remove('is-open');
    goToSlide(0);
});

document.getElementById('prev-btn').addEventListener('click', function () {
    goToSlide(currentSlide - 1);
});

document.getElementById('next-btn').addEventListener('click', function () {
    goToSlide(currentSlide + 1);
});

// 点击弹窗遮罩层本身（不是内部内容）也可以关闭
document.getElementById('history-container').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('is-open');
        goToSlide(0);
    }
});

// ===== 调试面板切换 =====
const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const pityInfo = document.getElementById('pityInfo');

if (toggleDebugBtn && pityInfo) {
    toggleDebugBtn.addEventListener('click', function () {
        // 用 getComputedStyle 检查实际显示状态，再 toggle is-visible 类
        const isHidden = window.getComputedStyle(pityInfo).display === 'none';
        pityInfo.classList.toggle('is-visible', isHidden);
    });
}

// 快捷键：Ctrl/Cmd + D 也能切换保底调试面板
document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        if (pityInfo) {
            const isHidden = window.getComputedStyle(pityInfo).display === 'none';
            pityInfo.classList.toggle('is-visible', isHidden);
        }
    }
});

// 应用自定义名单后刷新全局数据：重新分级、保留/重选 UP、重建滚动名单
// 策略：如果之前的 UP 还在新名单中就保留，否则重新随机选
function refreshStudentsFromCustomList() {
    const activeNames = getActiveStudentNames();
    createStarPools(activeNames.length ? activeNames : DEFAULT_STUDENT_NAMES);

    // 先暂存当前 UP，方便后面判断能否保留
    const currentFiveStarUp = fiveStarUP;
    const currentFourStarUps = fourStarUPs;
    // 先尝试从新 5星池选 1 个、新 4星池选最多 3 个作为默认 UP
    fiveStarUP = pickUPs(starPools[0], 1)[0] || pickUPs(students, 1)[0];
    fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));

    // 如果原来的 5星UP 还在新 5星池中 → 保留它（不因为名单变化而丢失 UP 身份）
    if (currentFiveStarUp && starPools[0].includes(currentFiveStarUp)) {
        fiveStarUP = currentFiveStarUp;
        // 4星UP 同理，从原列表中过滤出仍在新 4星池中的
        fourStarUPs = currentFourStarUps.filter(s => s !== fiveStarUP && starPools[1].includes(s));
        // 如果保留后数量不足，再随机补齐
        if (fourStarUPs.length < Math.min(3, starPools[1].length)) {
            fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));
        }
    }

    // 重建滚动名单（洗牌 + 生成 DOM + 更新 UP 显示）
    shuffledStudents = shuffleArray(students);
    generateScrollingNames();
    updateUPDisplay();
}

// 在设置弹窗的"角色池"Tab 中渲染所有角色，按稀有度分组、UP 角色置顶并高亮
function renderRolePool() {
    const container = document.getElementById('role-pool-list');
    if (!container) return;

    // 遍历 0(5星)/1(4星)/2(3星) 三个稀有度，每个渲染一个分组
    container.innerHTML = [0, 1, 2].map(index => {
        const rarityLabels = ['五星', '四星', '三星'];
        const upNames = index === 0 ? [fiveStarUP] : index === 1 ? fourStarUPs : [];
        // 排序：UP 角色排在最前面，非 UP 角色按原池顺序跟在后面
        const orderedNames = [
            ...upNames.filter(name => starPools[index].includes(name)),
            ...starPools[index].filter(name => !upNames.includes(name))
        ];

        return `
        <section class="role-pool-group">
            <h4 class="rarity-${index}"><span class="role-pool-rarity rarity-${index}">${rarityLabels[index]}</span><span>${starPools[index].length}人</span></h4>
            <div class="role-pool-names">${orderedNames.map(name => {
                const isFiveStarUP = index === 0 && name === fiveStarUP;
                const isFourStarUP = index === 1 && fourStarUPs.includes(name);
                const cleanName = name.replace(/<i[^>]*>.*?<\/i>/, '');
                // UP 角色在名字后面追加 <b class="...UP">UP</b> 标签，CSS 负责不同颜色
                const upClass = isFiveStarUP ? 'role-pool-up role-pool-up-five' : isFourStarUP ? 'role-pool-up role-pool-up-four' : '';
                return `<span>${cleanName}${upClass ? ` <b class="${upClass}">UP</b>` : ''}</span>`;
            }).join('')}</div>
        </section>
    `;
    }).join('');
}

// ===== 设置弹窗：打开、关闭、应用、重置、导入 =====

// 打开设置弹窗：把当前名单填入 textarea，同时渲染角色池（Pool Tab）
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const textarea = document.getElementById('custom-name-input');
    if (modal && textarea) {
        const current = getCustomNamesFromStorage();
        textarea.value = current.length ? current.join('\n') : '';
        renderRolePool();
        modal.classList.add('is-open');
        // 弹窗打开时禁止 body 滚动，防止背景页面还能滑动
        document.body.style.overflow = 'hidden';
    }
}

// 关闭设置弹窗：恢复 body 滚动
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('is-open');
    }
    document.body.style.overflow = '';
}

// 应用自定义名单：解析 textarea → 至少 10 个校验 → 持久化 → 刷新页面
function applyCustomNameList() {
    const textarea = document.getElementById('custom-name-input');
    if (!textarea) return;

    // 按换行符分割，trim 后过滤掉空行
    const lines = textarea.value.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 10) {
        alert('名单至少需要 10 个名字，请补充后再应用。');
        return;
    }
    saveCustomNamesToStorage(lines);

    // 理论上 lines.length 已经 >= 10，这里只是双保险
    if (!lines.length) {
        localStorage.removeItem('customStudentNames');
    }

    closeSettingsModal();
    // 刷新页面让新名单生效（重新初始化 starPools 等全局状态）
    window.location.reload();
}

// 重置名单：清空 textarea + 删除 localStorage + 刷新
function resetNameListTemplate() {
    const textarea = document.getElementById('custom-name-input');
    if (textarea) {
        textarea.value = '';
    }
    localStorage.removeItem('customStudentNames');
    closeSettingsModal();
    window.location.reload();
}

// 从 .txt 文件导入名单：FileReader 读取 → 解析 → 校验 → 自动保存并刷新
function readTxtNames(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result || '';
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 10) {
            alert('导入名单至少需要 10 个名字，当前只有 ' + lines.length + ' 个。');
            return;
        }
        // 自动填入 textarea 预览
        const textarea = document.getElementById('custom-name-input');
        if (textarea) {
            textarea.value = lines.join('\n');
        }
        // 自动保存并刷新（导入比手动编辑更确定，所以直接生效）
        saveCustomNamesToStorage(lines);
        closeSettingsModal();
        window.location.reload();
    };
    reader.readAsText(file);
}

// ===== 设置弹窗的 DOM 引用收集 =====
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsApplyBtn = document.getElementById('apply-name-list');
const settingsResetBtn = document.getElementById('reset-name-list');
const settingsModeButtons = document.querySelectorAll('.settings-mode-btn');
const settingsEditPanel = document.getElementById('settings-edit-panel');
const settingsImportPanel = document.getElementById('settings-import-panel');
const settingsPoolPanel = document.getElementById('settings-pool-panel');
const nameFileInput = document.getElementById('name-file-input');

// ===== 设置弹窗事件绑定 =====
if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
}
if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
}
if (settingsApplyBtn) {
    settingsApplyBtn.addEventListener('click', applyCustomNameList);
}
if (settingsResetBtn) {
    settingsResetBtn.addEventListener('click', resetNameListTemplate);
}

// 点击弹窗遮罩层本身也可以关闭
const settingsModal = document.getElementById('settings-modal');
if (settingsModal) {
    settingsModal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeSettingsModal();
        }
    });
}

// 设置弹窗的三个 Tab 切换：编辑 / 导入 / 角色池
settingsModeButtons.forEach(button => {
    button.addEventListener('click', function () {
        const mode = this.dataset.mode;  // 'edit' / 'import' / 'pool'
        settingsModeButtons.forEach(item => item.classList.toggle('active', item === this));
        // 三个面板互斥显示：只有当前 mode 对应的面板可见
        const showEdit = mode === 'edit';
        const showImport = mode === 'import';
        settingsEditPanel.classList.toggle('is-hidden', !showEdit);
        settingsImportPanel.classList.toggle('is-hidden', !showImport);
        settingsPoolPanel.classList.toggle('is-hidden', mode !== 'pool');
        // 切换到"角色池"Tab 时才重新渲染（避免其他 Tab 切换时做无用功）
        if (mode === 'pool') renderRolePool();
    });
});

// 文件选择：选完 .txt 后自动触发 readTxtNames，然后清空 input.value 以便下次选同一个文件
if (nameFileInput) {
    nameFileInput.addEventListener('change', function () {
        const file = this.files && this.files[0];
        if (file) {
            readTxtNames(file);
            this.value = '';  // 清空，这样下次选同一个文件 change 事件也会触发
        }
    });
}

// ===== DOMContentLoaded：页面首次加载完成后的所有初始化 =====
document.addEventListener('DOMContentLoaded', function () {
    updateTargetDateDisplay();

    // 倒计时修改按钮：用 prompt 让用户输入新目标时间
    const changeCountdownBtn = document.getElementById('changeCountdownBtn');
    if (changeCountdownBtn) {
        changeCountdownBtn.addEventListener('click', function () {
            // 把当前 examDate 格式化为 YYYY-MM-DD HH:MM:SS 作为默认值
            const current = new Date(examDate);
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            const hh = String(current.getHours()).padStart(2, '0');
            const mi = String(current.getMinutes()).padStart(2, '0');
            const ss = String(current.getSeconds()).padStart(2, '0');
            const defaultText = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
            const input = prompt('请输入新的倒计时目标时间，例如：2026-06-07 00:00:00', defaultText);
            if (input === null) return;   // 用户点了取消
            setExamDateFromInput(input);
        });
    }

    // ===== 一言（hitokoto）的 IntersectionObserver 自动管理 =====
    // 核心思路：只有当一言元素在视口中可见时才启动定时器，离开视口就清除
    // 这样用户不在看一言时不会发起无谓的网络请求
    const hitokotoElement = document.querySelector('.motivation-text');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isHitokotoVisible = entry.isIntersecting;

            if (isHitokotoVisible) {
                // 首次进入可见区：立即拉取 + 启动 60 秒定时器
                if (!hitokotoInterval) {
                    updateHitokoto();
                    hitokotoInterval = setInterval(updateHitokoto, 60000);
                }
            } else {
                // 离开可见区：停止定时器节省资源
                clearInterval(hitokotoInterval);
                hitokotoInterval = null;
            }
        });
    }, {
        threshold: 0.1  // 元素 10% 可见就算"可见"
    });

    if (hitokotoElement) {
        observer.observe(hitokotoElement);
    }

    // 即使一言不在可视区，页面加载时也先拉一次（保证有初始内容）
    updateHitokoto();
    hitokotoInterval = setInterval(updateHitokoto, 60000);

    // ===== 页面卸载时兜底清理定时器 =====
    window.addEventListener('unload', () => {
        clearInterval(hitokotoInterval);
    });

    // ===== 页面可见性切换：用户切到其他标签页时停止定时器，切回来再恢复 =====
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            clearInterval(hitokotoInterval);
        } else {
            hitokotoInterval = setInterval(updateHitokoto, 60000);
        }
    });
});

// ===== 页面加载完成后的首次渲染（在 DOMContentLoaded 外部立即执行）=====
updateCountdown();         // 倒计时
updateUPDisplay();         // UP 角色显示
generateScrollingNames();  // 滚动名单 DOM
updatePityDisplay();       // 保底状态面板

updateLotteryBtnText();    // 祈愿按钮文字（含累计次数）