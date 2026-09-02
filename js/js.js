const WALLPAPER_API = 'https://uapis.cn/api/v1/image/bing-daily';

function applyWallpaper() {
    const wallpaper = document.getElementById('bg-video');
    if (!wallpaper) return;
    wallpaper.style.backgroundImage = `url("${WALLPAPER_API}")`;
}

applyWallpaper();

// ====== 网络时间同步逻辑开始 ======
let timeOffset = 0; // 网络时间-本地时间（毫秒）
let networkTimeReady = false;
function getNetworkNow() {
    return Date.now() + timeOffset;
}
function getNetworkDate() {
    return new Date(getNetworkNow());
}
// 获取网络时间并计算偏移（使用RapidAPI）
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;
xhr.addEventListener('readystatechange', function () {
    if (this.readyState === this.DONE) {
        console.log('API返回内容:', this.responseText); // 调试用
        // 提取 datetime 或 utc_datetime 行
        let match = this.responseText.match(/^datetime:\s*(.+)$/m);
        if (!match) {
            match = this.responseText.match(/^utc_datetime:\s*(.+)$/m);
        }
        if (!match) {
            alert('无法提取时间信息。已使用本地时间作为替代。');
            // 网络时间获取失败，fallback到本地时间
            networkTimeReady = true;
            timeOffset = 0;
            // 初始化依赖时间的功能
            updateCountdown && updateCountdown();
            updateUPDisplay && updateUPDisplay();
            generateScrollingNames && generateScrollingNames();
            updatePityDisplay && updatePityDisplay();
            updateLotteryBtnText && updateLotteryBtnText();
            return;
        }
        const serverTimeStr = match[1].trim();
        const serverTime = new Date(serverTimeStr).getTime();
        if (isNaN(serverTime)) {
            alert('无法解析时间信息。已使用本地时间作为替代。');
            // 网络时间获取失败，fallback到本地时间
            networkTimeReady = true;
            timeOffset = 0;
            // 初始化依赖时间的功能
            updateCountdown && updateCountdown();
            updateUPDisplay && updateUPDisplay();
            generateScrollingNames && generateScrollingNames();
            updatePityDisplay && updatePityDisplay();
            updateLotteryBtnText && updateLotteryBtnText();
            return;
        }
        timeOffset = serverTime - Date.now();
        networkTimeReady = true;
        // 初始化依赖时间的功能
        updateCountdown && updateCountdown();
        updateUPDisplay && updateUPDisplay();
        generateScrollingNames && generateScrollingNames();
        updatePityDisplay && updatePityDisplay();
        updateLotteryBtnText && updateLotteryBtnText();
    }
});
xhr.open('GET', 'https://world-time-api3.p.rapidapi.com/ip.txt');
xhr.setRequestHeader('x-rapidapi-key', '321cc957b9msh51719babd0797e6p16a1d0jsn19a6f50ea3b0');
xhr.setRequestHeader('x-rapidapi-host', 'world-time-api3.p.rapidapi.com');
xhr.send();
// ====== 网络时间同步逻辑结束 ======

// 点名展示栏展开/收起逻辑
document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('toggleNamesBtn');
    var names = document.getElementById('scrollingNames');
    if (btn && names) {
        btn.onclick = function () {
            // 使用 getComputedStyle 判断实际显示状态
            const isHidden = window.getComputedStyle(names).display === 'none';
            names.classList.toggle('is-visible', isHidden);
            btn.textContent = isHidden ? '收起展示栏' : '展开展示栏';
        };
    }
});

// 移动端横屏检测与提示
function isMobileDevice() {
    const userAgent = navigator.userAgent || '';
    const mobilePattern = /(Android|iPhone|iPad|iPod|Mobile|Windows Phone)/i;
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return mobilePattern.test(userAgent) || (coarsePointer && window.innerWidth <= 1024);
}

function isPortraitMode() {
    return window.innerHeight >= window.innerWidth;
}

function updateMobileLandscapeTip() {
    const tip = document.getElementById('mobile-landscape-tip');
    if (!tip) return;

    const shouldShow = isMobileDevice() && isPortraitMode();
    tip.classList.toggle('show', shouldShow);
}

window.addEventListener('resize', updateMobileLandscapeTip);
window.addEventListener('orientationchange', updateMobileLandscapeTip);
document.addEventListener('DOMContentLoaded', updateMobileLandscapeTip);

// 禁止右键
document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

// 设置高考日期（2026年6月7日）
const DEFAULT_EXAM_DATE = new Date('June 7, 2026 00:00:00').getTime();
const CUSTOM_EXAM_DATE_KEY = 'customExamDate';
let examDate = Number(localStorage.getItem(CUSTOM_EXAM_DATE_KEY) || DEFAULT_EXAM_DATE);

function updateTargetDateDisplay() {
    const targetDateEl = document.getElementById('targetDate');
    const targetTimeEl = document.getElementById('targetTime');
    if (!targetDateEl || !targetTimeEl) return;

    const date = new Date(examDate);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    targetDateEl.textContent = `${yyyy}年${mm}月${dd}日`;
    targetTimeEl.textContent = `${hh}:${mi}:${ss}`;
}

function setExamDateFromInput(newDateValue) {
    const parsed = new Date(newDateValue);
    if (Number.isNaN(parsed.getTime())) {
        alert('时间格式不正确，请输入例如：2026-06-07 00:00:00');
        return false;
    }

    examDate = parsed.getTime();
    localStorage.setItem(CUSTOM_EXAM_DATE_KEY, String(examDate));
    updateTargetDateDisplay();
    updateCountdown();
    return true;
}

// 全屏功能
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', function () {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen();
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
});

document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
});

// 更新倒计时
function updateCountdown() {
    if (!networkTimeReady) return; // 等待网络时间同步
    const now = getNetworkNow();
    let distance = examDate - now;

    // 如果时间已到，全部归零
    if (distance <= 0) {
        document.getElementById('days').innerText = "0天";
        document.getElementById('hours').innerText = "00";
        document.getElementById('minutes').innerText = "00";
        document.getElementById('seconds').innerText = "00";
        document.getElementById('milliseconds').innerText = "000";
        return; // 不再递归调用
    }

    // 计算天、时、分、秒、毫秒
    const days = (Math.floor(distance / (1000 * 60 * 60 * 24) * 10) / 10).toFixed(1);
    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    const milliseconds = Math.floor(distance % 1000);

    // 更新显示
    document.getElementById('days').innerText =  days + "天";
    document.getElementById('hours').innerText = hours.toString().padStart(2, '0');
    document.getElementById('minutes').innerText = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').innerText = seconds.toString().padStart(2, '0');
    document.getElementById('milliseconds').innerText = milliseconds.toString().padStart(3, '0');

    requestAnimationFrame(updateCountdown);
}

// 一言功能
let hitokotoInterval;
let isUpdating = false;
let isHitokotoVisible = true;

function updateHitokoto() {
    if (isUpdating || !isHitokotoVisible) return;

    isUpdating = true;
    fetch('https://v1.hitokoto.cn')
        .then(response => response.json())
        .then(data => {
            const hitokoto = data.hitokoto || '';
            const from = data.from ? `『${data.from}』` : '';
            const fromWho = data.from_who ? `${data.from_who}` : '';

            // 淡出效果
            const hitokotoElement = document.getElementById('hitokoto');
            const fromElement = document.getElementById('from');

            hitokotoElement.style.transition = 'opacity 0.5s ease';
            fromElement.style.transition = 'opacity 0.5s ease';
            hitokotoElement.style.opacity = 0;
            fromElement.style.opacity = 0;

            // 等待淡出完成后再更新内容
            setTimeout(() => {
                hitokotoElement.innerText = hitokoto;
                fromElement.innerText = from + fromWho;
                // 淡入效果
                hitokotoElement.style.opacity = 1;
                fromElement.style.opacity = 1;

                // 动画完成后重置transition属性
                setTimeout(() => {
                            hitokotoElement.style.transition = '';
                            fromElement.style.transition = '';
                    isUpdating = false;
                }, 500);
            }, 500);
        })
        .catch(console.error);
}

// 问卷与简介功能
const announcementBtn = document.getElementById('announcement-btn');
const announcementContainer = document.getElementById('announcement-container');
const announcementCloseBtn = document.getElementById('announcement-close-btn');

announcementBtn.addEventListener('click', function () {
    announcementContainer.classList.add('is-open');
});

announcementCloseBtn.addEventListener('click', function () {
    announcementContainer.classList.remove('is-open');
});

announcementContainer.addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('is-open');
    }
});

// Fisher-Yates 洗牌算法
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 元素图标表
const elementMap = [
    { char: '\ue001', className: 'element-pyro' },
    { char: '\ue002', className: 'element-hydro' },
    { char: '\ue003', className: 'element-anemo' },
    { char: '\ue004', className: 'element-electro' },
    { char: '\ue005', className: 'element-dendro' },
    { char: '\ue006', className: 'element-cryo' },
    { char: '\ue007', className: 'element-geo' }
];

// 默认名单模板（用于未自定义时的兜底）
const DEFAULT_STUDENT_NAMES = [
    "张永沛", "雷俊杰", "陈馨怡", "殷俊强", "郑奎", "李依婷", "王俊楠",
    "贺梦菲", "黄金婷", "兰雨檐", "肖涵", "陈慧丽", "崔雯", "马英宸",
    "阮方钰", "袁卓峰", "徐啟锐", "刘一凡", "李健", "韦南楠",
    "阮心怡", "杨玉艺", "贺鹏城", "刘艺栋", "陈晨", "樊灵",
    "毛振宇", "徐馨", "索俊俊", "陈鑫", "徐一帆", "刘晨阳",
    "吴金昊", "阮玮", "代艳兴", "熊娜", "查钰钒",
    "程琳琳", "柯贤威", "茹官旺", "毛静雯", "朱治锦", "杨起浩",
    "樵世诚", "熊娅妮", "黄海棠", "程修均", "张维哲", "徐可欣",
    "张钰箐", "夏增婷", "吴昊昊", "周笠", "任鹏飞", "谢昌农",
    "程凯", "朱海英", "黄佳辉", "曹旖诺", "谢易航", "巩玉蓉"
];

function decorateNameWithElement(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return '';
    const randomIndex = Math.floor(Math.random() * elementMap.length);
    const el = elementMap[randomIndex];
    return `<i class="element-icon ${el.className}">${el.char}</i>${cleanName}`;
}

function getCustomNamesFromStorage() {
    try {
        const raw = localStorage.getItem('customStudentNames');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch (e) {
        return [];
    }
}

function saveCustomNamesToStorage(list) {
    localStorage.setItem('customStudentNames', JSON.stringify(list.map(item => String(item).trim()).filter(Boolean)));
}

function getActiveStudentNames() {
    const customNames = getCustomNamesFromStorage();
    return customNames.length ? customNames : DEFAULT_STUDENT_NAMES;
}

let students = getActiveStudentNames().map(decorateNameWithElement).filter(Boolean);

const starPoolWeights = [1, 8, 53];
let starPools = { 0: [], 1: [], 2: [] };

function createStarPools(names) {
    const decoratedNames = shuffleArray(names).map(decorateNameWithElement).filter(Boolean);
    const totalWeight = starPoolWeights.reduce((sum, weight) => sum + weight, 0);
    const counts = starPoolWeights.map(weight => Math.floor(decoratedNames.length * weight / totalWeight));
    const remainders = starPoolWeights.map((weight, index) => ({
        index,
        remainder: decoratedNames.length * weight / totalWeight - counts[index]
    }));

    let remaining = decoratedNames.length - counts.reduce((sum, count) => sum + count, 0);
    remainders.sort((left, right) => right.remainder - left.remainder);
    for (let index = 0; index < remaining; index++) {
        counts[remainders[index % remainders.length].index]++;
    }

    const minimumCounts = [1, 3, 0];
    for (let index = 0; index < minimumCounts.length; index++) {
        while (counts[index] < minimumCounts[index] && counts.reduce((sum, count) => sum + count, 0) <= decoratedNames.length) {
            const donorIndex = counts.findIndex((count, candidateIndex) => candidateIndex !== index && count > minimumCounts[candidateIndex]);
            if (donorIndex < 0) break;
            counts[donorIndex]--;
            counts[index]++;
        }
    }

    let cursor = 0;
    starPools = {
        0: decoratedNames.slice(cursor, cursor += counts[0]),
        1: decoratedNames.slice(cursor, cursor += counts[1]),
        2: decoratedNames.slice(cursor)
    };
    students = decoratedNames;
}

createStarPools(getActiveStudentNames());

// 随机选UP角色
function pickUPs(arr, count) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy[idx]);
        copy.splice(idx, 1);
    }
    return result;
}

// 页面刷新时随机UP
let fiveStarUP = pickUPs(starPools[0], 1)[0] || pickUPs(students, 1)[0];
let fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));

// 展示UP信息
function updateUPDisplay() {
    const fiveIcon = fiveStarUP.match(/<i[^>]*>.*?<\/i>/)[0];
    const fiveText = fiveStarUP.replace(/<i[^>]*>.*?<\/i>/, '');

    const fourHtml = fourStarUPs.map(n => {
        const icon = n.match(/<i[^>]*>.*?<\/i>/)[0];
        const txt = n.replace(/<i[^>]*>.*?<\/i>/, '');
        return `${icon}<span class="up-name up-name-four">${txt}</span>`;
    }).join('&nbsp;&nbsp;&nbsp;&nbsp;');

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

let shuffledStudents = shuffleArray(students);

function generateScrollingNames() {
    const container = document.getElementById('scrollingNames');
    if (!container) return;

    container.innerHTML = '';
    const doubleList = [...shuffledStudents, ...shuffledStudents];
    doubleList.forEach(student => {
        const nameElement = document.createElement('div');
        nameElement.className = 'name-item';
        const rarityIndex = Object.keys(starPools).find(index => starPools[index].includes(student));
        const rarityText = ['五星', '四星', '三星'][rarityIndex] || '';
        nameElement.dataset.studentName = student;
        nameElement.innerHTML = `${student}<span class="name-rarity rarity-${rarityIndex}">${rarityText}</span>`;
        container.appendChild(nameElement);
    });

    // 修正为“每个卡片约 1 秒”规律：名单越多，整体滚动时间越长，
    // 不再出现“名字很多时速度突然变快、看不清”的问题。
    const totalCards = doubleList.length;
    const duration = Math.max(20, totalCards);
    container.style.animation = `scroll ${duration}s linear infinite`;
}

// 稀有度配置
const rarityConfig = [
    { name: '⭐⭐⭐⭐⭐', color: 'linear-gradient(90deg,#FFD700,#FFA500)', textColor: '#000', chance: 0.006 },
    { name: '⭐⭐⭐⭐', color: 'linear-gradient(90deg,#A259FF,#8F5AFF)', textColor: '#fff', chance: 0.051 },
    { name: '⭐⭐⭐', color: 'linear-gradient(90deg,#00bfff,#1e90ff)', textColor: '#fff', chance: 0.943 }
];

// 获取当前是第几周
function getWeekNumber(date = getNetworkDate()) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay()) / 7);
}

// 获取本周key
function getWeekKey(key) {
    const today = getNetworkDate();
    const week = getWeekNumber(today);
    return key + '_' + today.getFullYear() + '_W' + week;
}

// 获取保底次数
function getPity(key, defaultValue = 0) {
    const weekKey = getWeekKey(key);
    const value = localStorage.getItem(weekKey);
    return value ? parseInt(value) : defaultValue;
}

// 设置保底次数
function setPity(key, value) {
    const weekKey = getWeekKey(key);
    localStorage.setItem(weekKey, value);
}

// 初始化保底
let totalDraws = getPity('totalDraws', 0);
let fiveStarPity = getPity('fiveStarPity', 0);
let fourStarPity = getPity('fourStarPity', 0);

// 大保底状态变量
let isGuaranteed5StarUP = localStorage.getItem('isGuaranteed5StarUP') === 'true';
let isGuaranteed4StarUP = localStorage.getItem('isGuaranteed4StarUP') === 'true';
let isCaptureLightGuaranteed = localStorage.getItem('isCaptureLightGuaranteed') === 'true';
let lastFiveStarWasNonUp = localStorage.getItem('lastFiveStarWasNonUp') === 'true';
let captureLightCounter = parseInt(localStorage.getItem('captureLightCounter') || '1', 10);

function setBooleanStorage(key, value) {
    localStorage.setItem(key, String(value));
}

// 更新保底信息显示
function updatePityDisplay() {
    const fiveStarGuaranteedActive = isGuaranteed5StarUP || isCaptureLightGuaranteed;
    const captureLightElement = document.getElementById('captureLightStatus');
    const captureLightCounterElement = document.getElementById('captureLightCounter');

    document.getElementById('fiveStarPityCount').innerHTML = fiveStarPity;
    document.getElementById('fourStarPityCount').innerHTML = fourStarPity;
    document.getElementById('fiveStarGuarantee').innerHTML = fiveStarGuaranteedActive ? "已激活" : "未激活";
    document.getElementById('fourStarGuarantee').innerHTML = isGuaranteed4StarUP ? "已激活" : "未激活";

    if (captureLightElement) {
        captureLightElement.innerHTML = isCaptureLightGuaranteed ? "已激活" : "未激活";
        captureLightElement.classList.toggle('is-guaranteed', isCaptureLightGuaranteed);
    }

    if (captureLightCounterElement) {
        captureLightCounterElement.innerHTML = Number.isFinite(captureLightCounter) ? captureLightCounter : 1;
    }

    document.getElementById('fiveStarGuarantee').classList.toggle('is-guaranteed', fiveStarGuaranteedActive);
    document.getElementById('fourStarGuarantee').classList.toggle('is-guaranteed', isGuaranteed4StarUP);
}

// 祈愿按钮文本显示祈愿次数
function updateLotteryBtnText() {
    lotteryBtn.innerText = `祈愿` + '\n' + `（累计${totalDraws}次）`;
}

// 获取本周历史记录key
function getHistoryKey() {
    const today = getNetworkDate();
    const week = getWeekNumber(today);
    return 'gachaHistory_' + today.getFullYear() + '_W' + week;
}

// 添加历史记录
function addHistoryRecord(name, rarity, isUP, triggeredCaptureLight = false) {
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const now = getNetworkDate();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = now.toLocaleTimeString();

    const newRecord = {
        name: name,
        rarity: rarity,
        isUP: isUP,
        triggeredCaptureLight: triggeredCaptureLight,
        date: dateStr,
        time: timeStr
    };

    history.unshift(newRecord);
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// 高亮名字函数
function highlightWinner(winnerName, rarityIndex) {
    scrollingNames.childNodes.forEach(el => {
        el.classList.remove('winner-rarity-0', 'winner-rarity-1', 'winner-rarity-2');
    });

    scrollingNames.childNodes.forEach(el => {
        if (el.dataset.studentName === winnerName) {
            el.classList.add(`winner-rarity-${rarityIndex}`);
        }
    });
}

// 祈愿功能
const lotteryBtn = document.getElementById('lotteryBtn');
const scrollingNames = document.getElementById('scrollingNames');
let isRolling = false;

// 十连抽相关变量
let isTenPullMode = false;
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // 长按0.5秒触发十连

// 修复点击/长按机制
lotteryBtn.addEventListener('mousedown', function (e) {
    e.preventDefault(); // 防止默认行为
    startLongPress();
});

lotteryBtn.addEventListener('touchstart', function (e) {
    e.preventDefault(); // 防止默认行为
    startLongPress();
});

lotteryBtn.addEventListener('mouseup', function (e) {
    e.preventDefault(); // 防止默认行为
    cancelLongPress();
});

lotteryBtn.addEventListener('touchend', function (e) {
    e.preventDefault(); // 防止默认行为
    cancelLongPress();
});

// 防止鼠标移出时误触发
lotteryBtn.addEventListener('mouseleave', function () {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        // 重置按钮状态
        lotteryBtn.innerText = `祈愿` + '\n' + `（累计${totalDraws}次）`;
        isTenPullMode = false;
    }
});

function startLongPress() {
    if (isRolling) return;

    longPressTimer = setTimeout(() => {
        isTenPullMode = true;
        lotteryBtn.innerText = '十连抽中...';
    }, LONG_PRESS_DURATION);
}

function cancelLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    if (isRolling) return;

    // 如果是长按触发的十连抽模式
    if (isTenPullMode) {
        performTenPull();
    }
    // 如果是短按触发的单抽
    else {
        performSinglePull();
    }
}

// 单抽函数 - 删除滚动动画
function performSinglePull() {
    if (isRolling) return;
    isRolling = true;

    // 直接抽取结果
    const result = drawOne();

    // 添加历史记录 - 这是修复的关键
    addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP, result.triggeredCaptureLight);

    // 高亮中奖名字
    highlightWinner(result.winnerName, result.rarityIndex);

    // 显示特效
    showFullEffect(result.winnerName, result.rarityIndex, {
        isCaptureLight: result.triggeredCaptureLight,
        onClose: function () {
            isRolling = false;
            isTenPullMode = false;
            updateLotteryBtnText();
        }
    });
}

// 十连抽函数 - 修正版本
function performTenPull() {
    if (isRolling) return;
    isRolling = true;

    // 一次性抽取10次结果
    const results = [];
    for (let i = 0; i < 10; i++) {
        results.push(drawOne());
    }

    // 立即记录所有历史记录
    results.forEach(result => {
        addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP, result.triggeredCaptureLight);
    });

    // 依次显示十连抽结果，所有结果都用特效显示
    showTenPullResults(results);
}

// 显示十连抽结果 - 修改为最后统一高亮
function showTenPullResults(results) {
    let currentIndex = 0;
    lotteryBtn.innerText = '十连抽中...';

    // 先收集所有要显示的结果，但不立即高亮
    function showNextResult() {
        if (currentIndex < results.length) {
            const result = results[currentIndex];

            // 所有星级都用特效显示，只是颜色不同
            showFullEffect(result.winnerName, result.rarityIndex, {
                isCaptureLight: result.triggeredCaptureLight,
                onClose: function () {
                    currentIndex++;
                    showNextResult();
                }
            });
        } else {
            // 所有结果显示完毕后，统一高亮所有名字
            highlightAllTenPullResults(results);
            finishTenPull();
        }
    }

    showNextResult();
}

// 新增函数：统一高亮十连抽的所有结果
function highlightAllTenPullResults(results) {
    scrollingNames.childNodes.forEach(el => {
        el.classList.remove('winner-rarity-0', 'winner-rarity-1', 'winner-rarity-2');
    });

    // 然后高亮所有中奖的名字（两个名单都高亮）
    results.forEach(result => {
        const winnerName = result.winnerName;
        const rarityIndex = result.rarityIndex;

        scrollingNames.childNodes.forEach(el => {
            if (el.dataset.studentName === winnerName) {
                el.classList.add(`winner-rarity-${rarityIndex}`);
            }
        });
    });
}

// 显示全屏大特效 - 修正版本，支持所有星级
function showFullEffect(name, rarityIndex, options = {}) {
    const { onClose, isCaptureLight = false } = options;
    const effectContainer = document.getElementById('wishEffect');
    const goldenLight = effectContainer.querySelector('.golden-light');
    const characterName = effectContainer.querySelector('.character-name');
    const nameText = effectContainer.querySelector('.name-text');
    const starsElement = effectContainer.querySelector('.stars');
    const continueBtn = effectContainer.querySelector('.wish-continue-btn');
    const captureLockMs = 5000;

    // 移除所有星级类，只保留基础类
    nameText.className = 'name-text';
    effectContainer.classList.remove('capture-light-mode');

    // 根据稀有度设置颜色和星星
    let color, stars, lightColor;
    if (rarityIndex === 0) {
        color = '#FFD700';
        stars = '⭐⭐⭐⭐⭐';
        lightColor = 'rgba(255, 215, 0, 0.8)'; // 金色
    } else if (rarityIndex === 1) {
        color = '#A259FF';
        stars = '⭐⭐⭐⭐';
        lightColor = 'rgba(162, 89, 255, 0.8)'; // 紫色
    } else {
        color = '#00bfff';
        stars = '⭐⭐⭐';
        lightColor = 'rgba(0, 191, 255, 0.8)'; // 蓝色
    }

    // 设置星星和颜色
    starsElement.innerHTML = stars;
    starsElement.style.color = color;

    // 捕获明光使用紫金双光交织，其他特效保持单色光辉
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

    // 播放音效（根据稀有度播放不同的音效）
    let audioToPlay = null;
    if (rarityIndex === 0) {
        audioToPlay = document.getElementById('fiveStarSound'); // 五星音效
    } else if (rarityIndex === 1) {
        audioToPlay = document.getElementById('fourStarSound'); // 四星音效
    } else {
        audioToPlay = document.getElementById('threeStarSound'); // 三星音效
    }

    if (audioToPlay) {
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch(error => {
            console.log('音频自动播放被阻止，需要用户交互:', error);
        });
    }

    // 解析名字，分离元素符号和文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = name;

    let elementHTML = '';
    let pureName = name;

    // 如果有元素符号，提取出来
    if (tempDiv.querySelector('i')) {
        elementHTML = tempDiv.innerHTML.match(/<i[^>]*>.*?<\/i>/)[0];
        elementHTML = elementHTML.replace('class="element-icon', 'class="element-icon effect-element-icon');
        pureName = name.replace(/<i[^>]*>.*?<\/i>/, '');
    }

    // 设置名字显示，元素符号保持原色，只有文本部分应用特效
    nameText.innerHTML = elementHTML + `<span class="${rarityIndex === 0 ? 'five-star-effect' : rarityIndex === 1 ? 'four-star-effect' : 'three-star-effect'}">${pureName}</span>`;

    // 显示特效容器
    effectContainer.classList.add('active');

    // 动画序列
    setTimeout(() => {
        goldenLight.style.animation = 'goldenLightAnimation 1.25s ease-out forwards';
        goldenLight.style.opacity = '1';
        characterName.classList.add('revealed');
    });

    // 重新绑定关闭事件
    continueBtn.disabled = isCaptureLight;
    continueBtn.style.opacity = isCaptureLight ? '0' : '1';
    continueBtn.style.cursor = isCaptureLight ? 'not-allowed' : 'pointer';
    continueBtn.title = isCaptureLight ? '捕获明光动画锁定中，请等待 5 秒后再关闭' : '继续';

    if (isCaptureLight) {
        const unlockAt = Date.now() + captureLockMs;
        continueBtn.onclick = function () {
            if (Date.now() < unlockAt) {
                return;
            }
            if (onClose) {
                onClose();
            }
        };
        setTimeout(() => {
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            continueBtn.title = '继续';
            continueBtn.onclick = function () {
                goldenLight.style.animation = 'none';
                goldenLight.style.opacity = '0';
                characterName.classList.remove('revealed');
                effectContainer.classList.remove('active');

                // 停止所有音效播放
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
        return;
    }

    continueBtn.onclick = function () {
        goldenLight.style.animation = 'none';
        goldenLight.style.opacity = '0';
        characterName.classList.remove('revealed');
        effectContainer.classList.remove('active');

        // 停止所有音效播放
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

// 完成十连抽
function finishTenPull() {
    isRolling = false;
    isTenPullMode = false;
    updateLotteryBtnText();
}

// 抽卡核心逻辑
function drawOne() {
    let rarityIndex = 2;
    totalDraws++;
    fiveStarPity++;
    fourStarPity++;

    function getFiveStarChance(pity) {
        if (pity < 74) return 0.006;
        const table = {
            74: 0.0660,
            75: 0.1260,
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
            90: 1.0000
        };
        return table[pity] || 1.0;
    }

    const fiveStarChance = getFiveStarChance(fiveStarPity);
    const rand = Math.random();

    if (fiveStarPity >= 90) {
        rarityIndex = 0;
        fiveStarPity = 0;
        fourStarPity = 0;
    } else if (fourStarPity >= 10) {
        rarityIndex = 1;
        fourStarPity = 0;
    } else if (rand < fiveStarChance) {
        rarityIndex = 0;
        fiveStarPity = 0;
        fourStarPity = 0;
    } else if (rand < fiveStarChance + rarityConfig[1].chance) {
        rarityIndex = 1;
        fourStarPity = 0;
    }

    setPity('totalDraws', totalDraws);
    setPity('fiveStarPity', fiveStarPity);
    setPity('fourStarPity', fourStarPity);
    updateLotteryBtnText();

    let winnerName = '';
    let isUP = false;
    let triggeredCaptureLight = false;

    if (rarityIndex === 0) {
        const previousWasNonUp = lastFiveStarWasNonUp;
        const guaranteedUp = isGuaranteed5StarUP;
        const captureLightForced = isCaptureLightGuaranteed;
        const fullAlternatingCycleReady = captureLightCounter >= 3;

        // 机制 1：强制状态 / 保底状态，优先级最高
        if (guaranteedUp) {
            winnerName = fiveStarUP;
            isUP = true;
            isGuaranteed5StarUP = false;
        } else if (captureLightForced) {
            // 机制 2：捕获明光计数器满足 3 后，下一次 UP 必定触发明光
            winnerName = fiveStarUP;
            isUP = true;
            triggeredCaptureLight = true;
            isCaptureLightGuaranteed = false;
            captureLightCounter = 1;
        } else if (fullAlternatingCycleReady) {
            // 机制 3：计数器达到 3，下一次 UP 触发捕获明光，并恢复为默认 1
            winnerName = fiveStarUP;
            isUP = true;
            triggeredCaptureLight = true;
            isCaptureLightGuaranteed = false;
            captureLightCounter = 1;
        } else {
            // 普通五星随机逻辑
            const standardFiveStarUpChance = 0.5;

            if (Math.random() < standardFiveStarUpChance) {
                winnerName = fiveStarUP;
                isUP = true;
            } else {
                const candidates = starPools[0].filter(s => s !== fiveStarUP);
                if (!candidates.length) candidates.push(...starPools[0]);
                winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                isUP = false;
                isGuaranteed5StarUP = true;
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

        lastFiveStarWasNonUp = !isUP;
        setBooleanStorage('isGuaranteed5StarUP', isGuaranteed5StarUP);
        setBooleanStorage('isCaptureLightGuaranteed', isCaptureLightGuaranteed);
        setBooleanStorage('lastFiveStarWasNonUp', lastFiveStarWasNonUp);
        localStorage.setItem('captureLightCounter', String(captureLightCounter));
        fiveStarPity = 0;
        fourStarPity = 0;

    } else if (rarityIndex === 1) {
        fourStarPity = 0;

        if (isGuaranteed4StarUP) {
            winnerName = fourStarUPs[Math.floor(Math.random() * fourStarUPs.length)];
            isUP = true;
            isGuaranteed4StarUP = false;
        } else {
            if (Math.random() < 0.5) {
                winnerName = fourStarUPs[Math.floor(Math.random() * fourStarUPs.length)];
                isUP = true;
            } else {
                const candidates = starPools[1].filter(s => !fourStarUPs.includes(s));
                if (!candidates.length) candidates.push(...starPools[1]);
                winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                isUP = false;
                isGuaranteed4StarUP = true;
            }
        }

        setBooleanStorage('isGuaranteed4StarUP', isGuaranteed4StarUP);
        localStorage.setItem('isGuaranteed4StarUP', isGuaranteed4StarUP ? 'true' : 'false');
    } else {
        const candidates = starPools[2].length ? starPools[2] : students;
        winnerName = candidates[Math.floor(Math.random() * candidates.length)];
    }

    updatePityDisplay();

    setPity('totalDraws', totalDraws);
    setPity('fiveStarPity', fiveStarPity);
    setPity('fourStarPity', fourStarPity);
    setBooleanStorage('isGuaranteed5StarUP', isGuaranteed5StarUP);
    setBooleanStorage('isGuaranteed4StarUP', isGuaranteed4StarUP);
    setBooleanStorage('isCaptureLightGuaranteed', isCaptureLightGuaranteed);
    setBooleanStorage('lastFiveStarWasNonUp', lastFiveStarWasNonUp);
    localStorage.setItem('captureLightCounter', String(captureLightCounter));

    return {
        winnerName,
        rarityIndex,
        isUP,
        triggeredCaptureLight
    };
}

// 历史记录相关功能
let currentSlide = 0;
let totalSlides = 0;

// 显示历史记录
function showHistory() {
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const slidesContainer = document.getElementById('history-slides');

    slidesContainer.innerHTML = '';

    if (history.length === 0) {
        slidesContainer.innerHTML = '<div class="no-history">本周暂无祈愿记录</div>';
        document.getElementById('prev-btn').disabled = true;
        document.getElementById('next-btn').disabled = true;
        document.getElementById('history-container').classList.add('is-open');
        return;
    }

    totalSlides = Math.ceil(history.length / 5);
    currentSlide = 0;

    document.getElementById('prev-btn').disabled = true;
    document.getElementById('next-btn').disabled = totalSlides <= 1;

    for (let i = 0; i < totalSlides; i++) {
        const group = document.createElement('div');
        group.className = 'history-group';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'group-title';
        groupTitle.innerHTML = `第 ${i + 1} 页 / 共 ${totalSlides} 页`;

        groupHeader.appendChild(groupTitle);
        group.appendChild(groupHeader);

        for (let j = i * 5; j < Math.min((i + 1) * 5, history.length); j++) {
            const record = history[j];
            const item = document.createElement('div');
            item.className = 'history-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.innerHTML = record.name;

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

    document.getElementById('prev-btn').onclick = function () {
        goToSlide(currentSlide - 1);
    };
    document.getElementById('next-btn').onclick = function () {
        goToSlide(currentSlide + 1);
    };
    document.getElementById('jump-btn').onclick = function () {
        const val = parseInt(document.getElementById('page-input').value, 10);
        if (val >= 1 && val <= totalSlides) {
            goToSlide(val - 1);
        }
    };
    document.getElementById('page-input').onkeydown = function (e) {
        if (e.key === 'Enter') {
            document.getElementById('jump-btn').click();
        }
    };

    goToSlide(0);
    document.getElementById('history-container').classList.add('is-open');
}

function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;

    currentSlide = index;
    const slidesContainer = document.getElementById('history-slides');
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;

    document.getElementById('prev-btn').disabled = currentSlide === 0;
    document.getElementById('next-btn').disabled = currentSlide === totalSlides - 1;

    const input = document.getElementById('page-input');
    if (input) input.value = currentSlide + 1;

    const allHeaders = document.querySelectorAll('.group-header .group-title');
    allHeaders.forEach((el, idx) => {
        el.innerHTML = `第 ${idx + 1} 页 / 共 ${totalSlides} 页`;
    });
}

function exportHistoryToExcel() {
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    if (!history.length) {
        alert('当前没有可导出的祈愿记录。');
        return;
    }

    const rows = history.map((record, index) => {
        const plainName = (record.name || '')
            .replace(/<i[^>]*>.*?<\/i>/g, '')
            .replace(/<[^>]+>/g, '')
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

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, '祈愿记录');

    const exportDate = getNetworkDate();
const fileName = `祈愿记录_${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, '0')}-${String(exportDate.getDate()).padStart(2, '0')}_${String(exportDate.getHours()).padStart(2, '0')}-${String(exportDate.getMinutes()).padStart(2, '0')}-${String(exportDate.getSeconds()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

// 初始化历史记录功能
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

document.getElementById('history-container').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('is-open');
        goToSlide(0);
    }
});

const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const pityInfo = document.getElementById('pityInfo');

if (toggleDebugBtn && pityInfo) {
    toggleDebugBtn.addEventListener('click', function () {
        const isHidden = window.getComputedStyle(pityInfo).display === 'none';
        pityInfo.classList.toggle('is-visible', isHidden);
    });
}

document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        if (pityInfo) {
            const isHidden = window.getComputedStyle(pityInfo).display === 'none';
            pityInfo.classList.toggle('is-visible', isHidden);
        }
    }
});

function refreshStudentsFromCustomList() {
    const activeNames = getActiveStudentNames();
    createStarPools(activeNames.length ? activeNames : DEFAULT_STUDENT_NAMES);

    const currentFiveStarUp = fiveStarUP;
    const currentFourStarUps = fourStarUPs;
    fiveStarUP = pickUPs(starPools[0], 1)[0] || pickUPs(students, 1)[0];
    fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));

    if (currentFiveStarUp && starPools[0].includes(currentFiveStarUp)) {
        fiveStarUP = currentFiveStarUp;
        fourStarUPs = currentFourStarUps.filter(s => s !== fiveStarUP && starPools[1].includes(s));
        if (fourStarUPs.length < Math.min(3, starPools[1].length)) {
            fourStarUPs = pickUPs(starPools[1], Math.min(3, starPools[1].length));
        }
    }

    shuffledStudents = shuffleArray(students);
    generateScrollingNames();
    updateUPDisplay();
}

function renderRolePool() {
    const container = document.getElementById('role-pool-list');
    if (!container) return;

    container.innerHTML = [0, 1, 2].map(index => {
        const rarityLabels = ['五星', '四星', '三星'];
        const upNames = index === 0 ? [fiveStarUP] : index === 1 ? fourStarUPs : [];
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
                const upClass = isFiveStarUP ? 'role-pool-up role-pool-up-five' : isFourStarUP ? 'role-pool-up role-pool-up-four' : '';
                return `<span>${cleanName}${upClass ? ` <b class="${upClass}">UP</b>` : ''}</span>`;
            }).join('')}</div>
        </section>
    `;
    }).join('');
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const textarea = document.getElementById('custom-name-input');
    if (modal && textarea) {
        const current = getCustomNamesFromStorage();
        textarea.value = current.length ? current.join('\n') : '';
        renderRolePool();
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('is-open');
    }
    document.body.style.overflow = '';
}

function applyCustomNameList() {
    const textarea = document.getElementById('custom-name-input');
    if (!textarea) return;

    const lines = textarea.value.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 10) {
        alert('名单至少需要 10 个名字，请补充后再应用。');
        return;
    }
    saveCustomNamesToStorage(lines);

    if (!lines.length) {
        localStorage.removeItem('customStudentNames');
    }

    closeSettingsModal();
    window.location.reload();
}

function resetNameListTemplate() {
    const textarea = document.getElementById('custom-name-input');
    if (textarea) {
        textarea.value = '';
    }
    localStorage.removeItem('customStudentNames');
    closeSettingsModal();
    window.location.reload();
}

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
        const textarea = document.getElementById('custom-name-input');
        if (textarea) {
            textarea.value = lines.join('\n');
        }
        saveCustomNamesToStorage(lines);
        closeSettingsModal();
        window.location.reload();
    };
    reader.readAsText(file);
}

const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsApplyBtn = document.getElementById('apply-name-list');
const settingsResetBtn = document.getElementById('reset-name-list');
const settingsModeButtons = document.querySelectorAll('.settings-mode-btn');
const settingsEditPanel = document.getElementById('settings-edit-panel');
const settingsImportPanel = document.getElementById('settings-import-panel');
const settingsPoolPanel = document.getElementById('settings-pool-panel');
const nameFileInput = document.getElementById('name-file-input');

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

const settingsModal = document.getElementById('settings-modal');
if (settingsModal) {
    settingsModal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeSettingsModal();
        }
    });
}

settingsModeButtons.forEach(button => {
    button.addEventListener('click', function () {
        const mode = this.dataset.mode;
        settingsModeButtons.forEach(item => item.classList.toggle('active', item === this));
        const showEdit = mode === 'edit';
        const showImport = mode === 'import';
        settingsEditPanel.classList.toggle('is-hidden', !showEdit);
        settingsImportPanel.classList.toggle('is-hidden', !showImport);
        settingsPoolPanel.classList.toggle('is-hidden', mode !== 'pool');
        document.querySelector('.settings-actions').classList.toggle('is-hidden', mode === 'pool');
        if (mode === 'pool') renderRolePool();
    });
});

if (nameFileInput) {
    nameFileInput.addEventListener('change', function () {
        const file = this.files && this.files[0];
        if (file) {
            readTxtNames(file);
            this.value = '';
        }
    });
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function () {
    updateTargetDateDisplay();

    const changeCountdownBtn = document.getElementById('changeCountdownBtn');
    if (changeCountdownBtn) {
        changeCountdownBtn.addEventListener('click', function () {
            const current = new Date(examDate);
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            const hh = String(current.getHours()).padStart(2, '0');
            const mi = String(current.getMinutes()).padStart(2, '0');
            const ss = String(current.getSeconds()).padStart(2, '0');
            const defaultText = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
            const input = prompt('请输入新的倒计时目标时间，例如：2026-06-07 00:00:00', defaultText);
            if (input === null) return;
            setExamDateFromInput(input);
        });
    }

    const hitokotoElement = document.querySelector('.motivation-text');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isHitokotoVisible = entry.isIntersecting;

            if (isHitokotoVisible) {
                if (!hitokotoInterval) {
                    updateHitokoto();
                    hitokotoInterval = setInterval(updateHitokoto, 60000);
                }
            } else {
                clearInterval(hitokotoInterval);
                hitokotoInterval = null;
            }
        });
    }, {
        threshold: 0.1
    });

    if (hitokotoElement) {
        observer.observe(hitokotoElement);
    }

    // 初始化一言
    updateHitokoto();
    hitokotoInterval = setInterval(updateHitokoto, 60000);

    // 页面卸载时清除定时器
    window.addEventListener('unload', () => {
        clearInterval(hitokotoInterval);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            clearInterval(hitokotoInterval);
        } else {
            hitokotoInterval = setInterval(updateHitokoto, 60000);
        }
    });
});

// 初始更新
updateCountdown();
updateUPDisplay();
generateScrollingNames();
updatePityDisplay();

updateLotteryBtnText();
