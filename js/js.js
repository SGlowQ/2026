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
                                alert('API返回时间格式无法识别: ' + this.responseText);
                                networkTimeReady = true;
                                return;
                            }
                            const serverTimeStr = match[1].trim();
                            const serverTime = new Date(serverTimeStr).getTime();
                            if (isNaN(serverTime)) {
                                alert('提取到的时间无法识别: ' + serverTimeStr);
                                networkTimeReady = true;
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
                    document.addEventListener('DOMContentLoaded', function() {
                        var btn = document.getElementById('toggleNamesBtn');
                        var names = document.getElementById('scrollingNames');
                        if(btn && names) {
                            btn.onclick = function() {
                                if(names.style.display === 'none') {
                                    names.style.display = '';
                                    btn.textContent = '收起展示栏';
                                } else {
                                    names.style.display = 'none';
                                    btn.textContent = '展开展示栏';
                                }
                            };
                        }
                    });
                    // 禁止右键
                    document.addEventListener('contextmenu', function (event) {
                        event.preventDefault();
                    });

                    // 设置高考日期（2026年6月7日）
                    const examDate = new Date('June 7, 2026 00:00:00').getTime();

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
                        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                        const hours = Math.floor(distance / (1000 * 60 * 60));
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                        const milliseconds = Math.floor(distance % 1000);

                        // 更新显示
                        document.getElementById('days').innerText = days + "天";
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
                                    fromElement.style.fontSize = '20px';

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
                        announcementContainer.style.display = 'flex';
                    });

                    announcementCloseBtn.addEventListener('click', function () {
                        announcementContainer.style.display = 'none';
                    });

                    announcementContainer.addEventListener('click', function (e) {
                        if (e.target === this) {
                            this.style.display = 'none';
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
                        { char: '\ue001', color: 'var(--pyro)' },
                        { char: '\ue002', color: 'var(--hydro)' },
                        { char: '\ue003', color: 'var(--anemo)' },
                        { char: '\ue004', color: 'var(--electro)' },
                        { char: '\ue005', color: 'var(--dendro)' },
                        { char: '\ue006', color: 'var(--cryo)' },
                        { char: '\ue007', color: 'var(--geo)' }
                    ];

                    // 生成带随机元素图标的名字数组
                    const students = [
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
                    ].map((name) => {
                        const randomIndex = Math.floor(Math.random() * elementMap.length);
                        const el = elementMap[randomIndex];
                        return `<i style="font-family:Elements;font-size:1.4rem;color:${el.color};margin-right:6px;font-style:normal;">${el.char}</i>${name}`;
                    });

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
                    let fiveStarUP = pickUPs(students, 1)[0];
                    let fourStarUPs = pickUPs(students.filter(s => s !== fiveStarUP), 3);

                    // 展示UP信息
                    function updateUPDisplay() {
                        const fiveIcon = fiveStarUP.match(/<i[^>]*>.*?<\/i>/)[0];
                        const fiveText = fiveStarUP.replace(/<i[^>]*>.*?<\/i>/, '');

                        const fourHtml = fourStarUPs.map(n => {
                            const icon = n.match(/<i[^>]*>.*?<\/i>/)[0];
                            const txt = n.replace(/<i[^>]*>.*?<\/i>/, '');
                            return `${icon}<span style="background:linear-gradient(90deg,#A259FF,#8F5AFF);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:bold;">${txt}</span>`;
                        }).join('&nbsp;&nbsp;&nbsp;&nbsp;');

                        document.getElementById('upInfo').innerHTML = `
        <div class="up-line">
            <span style="font-weight:bold;color:#FFD700;">五星UP：</span>
            ${fiveIcon}
            <span style="background:linear-gradient(90deg,#FFD700,#FFA500);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:bold;">${fiveText}</span>
        </div>
        <div class="up-line">
            <span style="font-weight:bold;color:#A259FF;">四星UP：</span>
            ${fourHtml}
        </div>
    `;
                    }

                    const shuffledStudents = shuffleArray(students);

                    function generateScrollingNames() {
                        const container = document.getElementById('scrollingNames');
                        container.innerHTML = '';
                        const doubleList = [...shuffledStudents, ...shuffledStudents];
                        doubleList.forEach(student => {
                            const nameElement = document.createElement('div');
                            nameElement.className = 'name-item';
                            nameElement.innerHTML = student;
                            container.appendChild(nameElement);
                        });
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

                    // 更新保底信息显示
                    function updatePityDisplay() {
                        document.getElementById('fiveStarPityCount').innerHTML = fiveStarPity;
                        document.getElementById('fourStarPityCount').innerHTML = fourStarPity;
                        document.getElementById('fiveStarGuarantee').innerHTML = isGuaranteed5StarUP ? "已激活" : "未激活";
                        document.getElementById('fourStarGuarantee').innerHTML = isGuaranteed4StarUP ? "已激活" : "未激活";

                        document.getElementById('fiveStarGuarantee').style.color = isGuaranteed5StarUP ? "#00ff00" : "#ffeb3b";
                        document.getElementById('fourStarGuarantee').style.color = isGuaranteed4StarUP ? "#00ff00" : "#ffeb3b";
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
                    function addHistoryRecord(name, rarity, isUP) {
                        const historyKey = getHistoryKey();
                        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

                        const now = getNetworkDate();
                        const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                        const timeStr = now.toLocaleTimeString();

                        const newRecord = {
                            name: name,
                            rarity: rarity,
                            isUP: isUP,
                            date: dateStr,
                            time: timeStr
                        };

                        history.unshift(newRecord);
                        localStorage.setItem(historyKey, JSON.stringify(history));
                    }

                    // 高亮名字函数
                    function highlightWinner(winnerName, rarityIndex) {
                        // 先重置所有名字的样式
                        scrollingNames.childNodes.forEach(el => {
                            el.style.background = '';
                            el.style.color = '';
                            el.style.fontWeight = '';
                            el.style.boxShadow = '';
                            el.style.border = '';
                        });

                        // 然后高亮所有匹配的名字（两个名单都高亮）
                        scrollingNames.childNodes.forEach((el, i) => {
                            if (el.innerHTML === winnerName) {
                                el.style.background = rarityConfig[rarityIndex].color;
                                el.style.color = rarityConfig[rarityIndex].textColor;
                                el.style.fontWeight = 'bold';
                                el.style.boxShadow = rarityIndex === 0 ? '0 0 32px 12px #FFD700' :
                                    rarityIndex === 1 ? '0 0 24px 8px #A259FF' :
                                        '0 0 16px 6px #00bfff';
                                el.style.border = rarityIndex === 0 ? '3px solid #FFD700' :
                                    rarityIndex === 1 ? '3px solid #A259FF' :
                                        '3px solid #00bfff';
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
                        addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP);

                        // 高亮中奖名字
                        highlightWinner(result.winnerName, result.rarityIndex);

                        // 显示特效
                        showFiveStarEffect(result.winnerName, result.rarityIndex, result.isUP, function () {
                            isRolling = false;
                            isTenPullMode = false;
                            updateLotteryBtnText();
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
                            addHistoryRecord(result.winnerName, result.rarityIndex, result.isUP);
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
                                showFiveStarEffect(result.winnerName, result.rarityIndex, result.isUP, function () {
                                    currentIndex++;
                                    showNextResult();
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
                    // 找到这个函数，修改循环逻辑
                    function highlightAllTenPullResults(results) {
                        // 先重置所有名字的样式
                        scrollingNames.childNodes.forEach(el => {
                            el.style.background = '';
                            el.style.color = '';
                            el.style.fontWeight = '';
                            el.style.boxShadow = '';
                            el.style.border = '';
                        });

                        // 然后高亮所有中奖的名字（两个名单都高亮）
                        results.forEach(result => {
                            const winnerName = result.winnerName;
                            const rarityIndex = result.rarityIndex;

                            // 找到所有匹配的名字位置（两个名单都高亮）
                            scrollingNames.childNodes.forEach((el, i) => {
                                if (el.innerHTML === winnerName) {
                                    el.style.background = rarityConfig[rarityIndex].color;
                                    el.style.color = rarityConfig[rarityIndex].textColor;
                                    el.style.fontWeight = 'bold';
                                    el.style.boxShadow = rarityIndex === 0 ? '0 0 32px 12px #FFD700' :
                                        rarityIndex === 1 ? '0 0 24px 8px #A259FF' :
                                            '0 0 16px 6px #00bfff';
                                    el.style.border = rarityIndex === 0 ? '3px solid #FFD700' :
                                        rarityIndex === 1 ? '3px solid #A259FF' :
                                            '3px solid #00bfff';
                                }
                            });
                        });
                    }

                    // 显示五星大特效 - 修正版本，支持所有星级
                    function showFiveStarEffect(name, rarityIndex, isUP, onClose) {
                        const effectContainer = document.getElementById('wishEffect');
                        const goldenLight = effectContainer.querySelector('.golden-light');
                        const characterName = effectContainer.querySelector('.character-name');
                        const nameText = effectContainer.querySelector('.name-text');
                        const starsElement = effectContainer.querySelector('.stars');

                        // 移除所有星级类，只保留基础类
                        nameText.className = 'name-text';

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

                        // 设置金光颜色
                        goldenLight.style.background = `radial-gradient(circle, rgba(255, 255, 255, 0) 0%, ${lightColor} 40%, ${lightColor} 70%)`;

                        // 添加UP标记
                        const upMark = isUP ? ' UP!' : '';
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
                            elementHTML = elementHTML.replace('font-size:1.4rem', 'font-size:3rem;font-weight:normal');
                            pureName = name.replace(/<i[^>]*>.*?<\/i>/, '');
                        }

                        // 设置名字显示，元素符号保持原色，只有文本部分应用特效
                        nameText.innerHTML = elementHTML + `<span class="${rarityIndex === 0 ? 'five-star-effect' : rarityIndex === 1 ? 'four-star-effect' : 'three-star-effect'}">${pureName}${upMark}</span>`;

                        // 显示特效容器
                        effectContainer.classList.add('active');

                        // 动画序列
                        setTimeout(() => {
                            goldenLight.style.animation = 'goldenLightAnimation 1.25s ease-out forwards';
                            goldenLight.style.opacity = '1';
                            characterName.classList.add('revealed');
                        });

                        // 重新绑定关闭事件
                        const continueBtn = effectContainer.querySelector('.wish-continue-btn');
                        continueBtn.onclick = function () {
                            goldenLight.style.animation = 'none';
                            goldenLight.style.opacity = '0';
                            characterName.classList.remove('revealed');
                            effectContainer.classList.remove('active');

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
                        // 保底机制
                        let rarityIndex = 2;
                        totalDraws++;
                        fiveStarPity++;
                        fourStarPity++;

                        if (fiveStarPity >= 90) {
                            rarityIndex = 0;
                            fiveStarPity = 0;
                            fourStarPity = 0;
                        } else if (fourStarPity >= 10) {
                            rarityIndex = 1;
                            fourStarPity = 0;
                        } else {
                            const rand = Math.random();
                            if (rand < rarityConfig[0].chance) {
                                rarityIndex = 0;
                                fiveStarPity = 0;
                                fourStarPity = 0;
                            } else if (rand < rarityConfig[0].chance + rarityConfig[1].chance) {
                                rarityIndex = 1;
                                fourStarPity = 0;
                            }
                        }

                        // 保存祈愿次数
                        setPity('totalDraws', totalDraws);
                        setPity('fiveStarPity', fiveStarPity);
                        setPity('fourStarPity', fourStarPity);

                        updateLotteryBtnText();

                        // 决定中奖人
                        let winnerName = '';
                        let isUP = false;
                        if (rarityIndex === 0) {
                            fiveStarPity = 0;
                            fourStarPity = 0;

                            if (isGuaranteed5StarUP) {
                                winnerName = fiveStarUP;
                                isUP = true;
                                isGuaranteed5StarUP = false;
                            } else {
                                if (Math.random() < 0.5) {
                                    winnerName = fiveStarUP;
                                    isUP = true;
                                } else {
                                    const candidates = students.filter(s => s !== fiveStarUP);
                                    winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                                    isUP = false;
                                    isGuaranteed5StarUP = true;
                                }
                            }

                            localStorage.setItem('isGuaranteed5StarUP', isGuaranteed5StarUP);
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
                                    const candidates = students.filter(s => !fourStarUPs.includes(s) && s !== fiveStarUP);
                                    winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                                    isUP = false;
                                    isGuaranteed4StarUP = true;
                                }
                            }

                            localStorage.setItem('isGuaranteed4StarUP', isGuaranteed4StarUP);
                        } else {
                            const candidates = students.filter(s => !fourStarUPs.includes(s) && s !== fiveStarUP);
                            winnerName = candidates[Math.floor(Math.random() * candidates.length)];
                        }

                        updatePityDisplay();

                        // 保存状态
                        setPity('totalDraws', totalDraws);
                        setPity('fiveStarPity', fiveStarPity);
                        setPity('fourStarPity', fourStarPity);
                        localStorage.setItem('isGuaranteed5StarUP', isGuaranteed5StarUP);
                        localStorage.setItem('isGuaranteed4StarUP', isGuaranteed4StarUP);

                        return {
                            winnerName,
                            rarityIndex,
                            isUP
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
                            document.getElementById('history-container').style.display = 'flex';
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
                                    raritySpan.innerHTML = '五星' + (record.isUP ? ' UP!' : '');
                                    nameSpan.style.color = '#FFD700';
                                } else if (record.rarity === 1) {
                                    raritySpan.classList.add('four-star');
                                    raritySpan.innerHTML = '四星' + (record.isUP ? ' UP!' : '');
                                    nameSpan.style.color = '#A259FF';
                                } else {
                                    raritySpan.classList.add('three-star');
                                    raritySpan.innerHTML = '三星';
                                    nameSpan.style.color = '#03a9f4';
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
        <input type="number" id="page-input" min="1" max="${totalSlides}" value="1"
            style="width:108px;height:36px;text-align:center;border:1px solid #90caf9;border-radius:8px;padding:0 8px;
            font-size:1rem;background:rgba(255,255,255,0.08);color:#fff;outline:none;transition:border 0.2s;">
        <button id="jump-btn" class="slider-btn" style="margin:0 10px;height:36px;width:60px;border-radius:8px;font-size:1rem;background:#4fc3f7;color:#fff;">跳转</button>
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
                        document.getElementById('history-container').style.display = 'flex';
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

                    // 初始化历史记录功能
                    document.getElementById('history-btn').addEventListener('click', showHistory);
                    document.getElementById('close-btn').addEventListener('click', function () {
                        document.getElementById('history-container').style.display = 'none';
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
                            this.style.display = 'none';
                            goToSlide(0);
                        }
                    });

                    // 页面加载完成后的初始化
                    document.addEventListener('DOMContentLoaded', function () {
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