const bvidList = [
    "BV1dUtKerEoj",/*❀*/
    "BV1uC411G7xB",/*5:20*/
    "BV1vv411L7BM",/*2 Phút Hơn (KAIZ Remix)*/
    "BV1um4y197SY",/*暗号*/
    "BV1cK41127n5",/*把回忆拼好给你*/
    "BV1Ut411D7rY",/*白金disco*/
    "BV1fT411j7gx",/*半山腰*/
    "BV1Cr4y1J7gV",/*不得不爱*/
    "BV1zi4y1v7FK",/*不该*/
    "BV17h4y1s7xx",/*不问别离*/
    "BV13w411E7fg",/*侧脸*/
    "BV12L411H7Wz",/*潮汐*/
    "BV1Nna2zMEKa",/*沉海*/
    "BV15G4y1X7pz",/*春风十里报新年*/
    "BV1WU411f7hB",/*春娇与志明*/
    "BV1Y1UaYVEtc",/*凑热闹*/
    "BV1bhFHewENE",/*打上花火*/
    "BV1Xs411s7HX",/*大鱼*/
    "BV1K34y1W7AB",/*十年人间*/
    "BV1Ki4y1y7HC",/*稻香*/
    "BV1DB4y157PH",/*等你下课*/
    "BV1DRt2zuEbU",/*第57次取消发送*/
    "BV1tx4y1n7kR",/*冬眠*/
    "BV1Yj41187gS",/*多谢你担心*/
    "BV1BY4y1K7gV",/*堕*/
    "BV11y4y187VB",/*枫*/
    "BV1qMs9eeEF2",/*佛系少女*/
    "BV1Sv411p7Ap",/*浮光*/
    "BV1ea411W7jD",/*高阶萌妹成长指南*/
    "BV1mL411E7Fb",/*告白气球*/
    "BV1M4411P7gM",/*搁浅*/
    "BV1ES4y1R7XP",/*孤勇者*/
    "BV1ws411Y7wi",/*光年之外*/
    "BV1nN411879y",/*归零*/
    "BV1C24y1C7NK",/*海の形*/
    "BV1SV41137gu",/*和煦的糖果风*/
    "BV1HG4y1d7FL",/*红尘客栈*/
    "BV1Ty421B78T",/*红昭愿*/
    "BV1zV411x7BH",/*后来*/
    "BV1Qh3kzHEXB",/*画离弦*/
    "BV1Av4y1H7D6",/*皇家萌卫*/
    "BV1bAS3Y5ELB",/*寂静之空*/
    "BV1kt411A7mK",/*简单爱*/
    "BV1CX4y1t7gA",/*骄傲的少年*/
    "BV1RJ411R7tF",/*句号*/
    "BV14Q4y1w7mg",/*诀别书*/
    "BV1wY4y1Q7TY",/*卡农*/
    "BV1wC411V7SA",/*浪人琵琶*/
    "BV1Rp4y1d7FW",/*离别开出花*/
    "BV1Lt41117vd",/*恋爱循环*/
    "BV1xJ4113783",/*龙卷风*/
    "BV1u8yKYXEkj",/*罗生门*/
    "BV1Zd4y1A7yc",/*妈妈的话*/
    "BV1cM4y1r7n1",/*面会菜*/
    "BV1m64y1k7rQ",/*明天你好*/
    "BV1sk9XYYEjd",/*明天会更好*/
    "BV1Y7sgeBEG9",/*末日出逃*/
    "BV13GfnYaEZj",/*暮色回响*/
    "BV1tW411b7G4",/*你从未离去*/
    "BV1Td6dY5EBc",/*你的答案*/
    "BV1GB4y1c7MZ",/*你的酒馆对我打了烊*/
    "BV1F7411F7mw",/*绿色*/
    "BV1aP411d73G",/*你看，天黑了*/
    "BV1YE411A7Ss",/*你笑起来真好看*/
    "BV15x4y1s79w",/*暖暖*/
    "BV1Rx54znE7k",/*琵琶行*/
    "BV1ki4y1d7Ln",/*偏爱*/
    "BV1bo4y1A7S9",/*平凡之路*/
    "BV1QV4y1x7eY",/*凄美地*/
    "BV19J411E7rk",/*ヤキモチ*/
    "BV1sM4y1V7x1",/*千本桜*/
    "BV1wLVmzRExG",/*亲爱的你啊*/
    "BV1r7411p7R4",/*青花瓷*/
    "BV1nq4y1H7vi",/*青空*/
    "BV17N411g7Ft",/*轻涟*/
    "BV1o54y1Y7oP",/*清空*/
    "BV1d4411N7zD",/*晴天*/
    "BV1uWwCePEEv",/*群青*/
    "BV19o4y1T7vL",/*如果呢*/
    "BV1Y4411A7Q7",/*珊瑚海*/
    "BV1De411p77r",/*少年*/
    "BV1iM4y177bG",/*奢香夫人*/
    "BV1wb411S7ey",/*生僻字*/
    "BV1pt7AzkE9H",/*世界这么大还是遇见你*/
    "BV1cQ4y1n7BY",/*インドア系ならトラックメイカー*/
    "BV1eC4y1G7J5",/*耍把戏*/
    "BV1DR4y1j7t3",/*四季予你*/
    "BV1fT4y137yU",/*所念皆星河*/
    "BV1Ki4y157jr",/*踏山河*/
    "BV15x411R7k7",/*滕王阁序*/
    "BV1fe4y1e789",/*天下*/
    "BV1zh4y1U7AL",/*天真的橡皮*/
    "BV1Xc5vzzEM9",/*跳楼机*/
    "BV1SHxszvEg4",/*嗵嗵*/
    "BV1Mm4y127w1",/*童话镇*/
    "BV1kr4y157qM",/*童年*/
    "BV1oTA6e3ERA",/*唯一*/
    "BV1RZ421B7gG",/*问神*/
    "BV1P24y1a7Lt",/*我不曾忘记*/
    "BV1sW4y1F7Hu",/*我乘着风飞过来*/
    "BV1Qc411h7Ys",/*我的悲伤是水做的*/
    "BV1Mx411r7mN",/*我们*/
    "BV1GB42167XF",/*我期待的不是雪*/
    "BV13v411V7Da",/*雾里*/
    "BV1oG4y1S7YR",/*西安人的歌*/
    "BV1Dm411y72s",/*下个，路口，见*/
    "BV1La8rzqErH",/*下山*/
    "BV1Ae4y1R7re",/*小城夏天*/
    "BV1jE411K7na",/*小城谣*/
    "BV1Tc411J7w2",/*心如止水*/
    "BV18W411S7Hw",/*心做し*/
    "BV1zhpRzFE4b",/*星茶会*/
    "BV1k1bBzTELJ",/*星空剪影*/
    "BV1yD4y1Q73y",/*悬溺*/
    "BV1Yf4y1J7Ek",/*烟花易泠*/
    "BV1U7411x7mj",/*夜、萤火虫与你*/
    "BV13J41117gd",/*夜空中最亮的星*/
    "BV11p4y1b7ej",/*一路向北*/
    "BV1UY4y1x7do",/*银河赴约*/
    "BV1Ft4y1i7ST",/*游京（新版）*/
    "BV1VK411N7sA",/*游山恋*/
    "BV1J54y1L7r1",/*鱼缸*/
    "BV1dyFNzoEYi",/*咏春*/
    "BV1ym411B7Li",/*宇宙尽头的碎片*/
    "BV1ts421K7ob",/*羽根*/
    "BV1YJ411x7C6",/*雨爱*/
    "BV1T44y1z7aT",/*在你的身边*/
    "BV18hFxemEWx",/*栋梁*/
    "BV1Lm4y1L7Fu",/*追光者*/
    "BV1hp411o7U9",/*追梦赤子心*/
    "BV19KxGemE1H",/*自娱自乐*/
    "BV1Dt42177Gt",/*最后一页*/
    "BV1ua411p7iA",/*最伟大的作品*/
    "BV1Ye4y187rh",/*左手右手*/
    "BV1Tg411b7jH",/*Ahead of Us*/
    "BV1pK4y1C7B8",/*Alpha*/
    "BV1FG411M7SC",/*Anomaly*/
    "BV1r44y1L7YL",/*Been Through*/
    "BV1cs411v7dU",/*Between Worlds*/
    "BV1rW411S7N9",/*Bloom of Youth*/
    "BV1ET41177Zo",/*Breath and life*/
    "BV1EM411R7rZ",/*Call of Silence*/
    "BV1Nx411D7Fd",/*Cocoon*/
    "BV1KPF4zvE1c",/*Collapsing World*/
    "BV1B4dDYXENm",/*Counting Stars (2025春节联欢晚会)*/
    "BV1ME411b7z9",/*Cardles*/
    "BV1x5Tcz7EHB",/*Crashing Hard*/
    "BV1kgCpY2Enj",/*Cry For Me(feat. Ami)*/
    "BV1Sr4y1L7xd",/*Dancin*/
    "BV1Xj411P7n1",/*Daylight*/
    "BV1sP4y1R7wV",/*Deep Blue*/
    "BV1SP4y1G7x3",/*Die For You*/
    "BV1yd4y1H7XP",/*Flower Dance*/
    "BV1KX4y1h7jp",/*Dont Wake Me Up*/
    "BV1N6421w79d",/*Dusk*/
    "BV1M7411j7jv",/*Ephemeral Memories*/
    "BV1SG411j7wk",/*Eutopia*/
    "BV13v4y1t7eh",/*Faded*/
    "BV1Li4y1i7Ur",/*Fake Love*/
    "BV1Xa4y1h7LT",/*Falling Again*/
    "BV1MW411b7mK",/*Feeling The Rain*/
    "BV1tN411V7dT",/*Ferrari*/
    "BV1M8411i7U6",/*Fight*/
    "BV18H4y197mQ",/*Fool For You*/
    "BV1qDDTYSELy",/*Fracturesl*/
    "BV1ih41147Z6",/*江南Style*/
    "BV1rG4y177Ad",/*the Garden of Escapism*/
    "BV1piSdY8Eo4",/*Go Again*/
    "BV1FzxxeYEqR",/*Good Time*/
    "BV1HW41197iY",/*Grace（惊鸿）*/
    "BV1bT421U7ui",/*Green to Blue (Sped Up)*/
    "BV1JN4y1q7vH",/*Grief*/
    "BV14L411G7Hk",/*Haggstrom*/
    "BV18s411c7yF",/*Heart linked(心弦）*/
    "BV1qh4y1Y7CL",/*His Theme*/
    "BV1W4421S7jh",/*III*/
    "BV1c4411q7dJ",/*Illusionary Daytime*/
    "BV14M411h7xb",/*Shadow Of The Sun*/
    "BV1kM41177Hy",/*In This Shirt*/
    "BV16H4y1m797",/*it's 6pm but I miss u already*/
    "BV1Lb4y1J7CP",/*Last Reunion*/
    "BV1cY41117NG",/*Lemon*/
    "BV1RR4y1L76K",/*Let it go*/
    "BV15Z4y1p7ML",/*Lifeline*/
    "BV11a411c7QD",/*Love is Gone*/
    "BV1Xm4y1U7fo",/*Love You Three 3000*/
    "BV1HB4y1q74L",/*Lucky*/
    "BV13d4y1K7Q2",/*May I See U Again*/
    "BV1oK411q7mp",/*Merry Christmas Mr.Lawrence*/
    "BV1yE411v7Pq",/*Mine (Illenium Remix)*/
    "BV1s441117W9",/*My Soul*/
    "BV1wx411H7GS",/*Nevada*/
    "BV1vh411T7F4",/*Nightlight*/
    "BV1kR4y1u7Hi",/*Normal No More*/
    "BV1wa3YenEA7",/*O Come O Come Emmanuel*/
    "BV1Ai421a71N",/*One Step Ahead*/
    "BV13T421D7Wg",/*Patience*/
    "BV13W411p7Ts",/*PLANET*/
    "BV1hW411w7X1",/*Refrain*/
    "BV1UW41137C5",/*The Right Path*/
    "BV1Ws411a7To",/*River Flows in You*/
    "BV1az4y1J7gZ",/*Sacred Play Secret Place*/
    "BV1ir4y1u74w",/*See Tình*/
    "BV1qU4y1F73A",/*See You Again*/
    "BV1T84y1Z7HV",/*Shed A Light*/
    "BV1Re4y1R7N2",/*Shed A Light*/
    "BV1Ev4y1D76J",/*So Far Away*/
    "BV1btzqYoEUv",/*Sold Out*/
    "BV14g4y1Z7eZ",/*Something Just Like This*/
    "BV1Pz421i7Zb",/*Somewhere*/
    "BV1ax411G7qh",/*The Spectre*/
    "BV1nh41167Wh",/*Stay*/
    "BV1P5411g7BX",/*Summer*/
    "BV1588zzcEro",/*Sunshine Girl*/
    "BV1gV4y1h7LC",/*Take Me Hand*/
    "BV1xg4y137UB",/*Take Me Somewhere Far Away From Here*/
    "BV1ce4y1e74x",/*Tassel*/
    "BV1Ex4y1A7NK",/*That Girl*/
    "BV1Ag41147Ws",/*The Truth That You Leave*/
    "BV1VM411w7W9",/*Time Stop*/
    "BV18U4y1w7CX",/*Touch*/
    "BV1B7411T7w2",/*Tough Love*/
    "BV1w8411D7HE",/*Towards the Light*/
    "BV17j411M7Wm",/*Wake (Live)*/
    "BV1vJ4m1g7y1",/*Walk Thru Fire*/
    "BV1KK411i7iZ",/*Way Back*/
    "BV15F411t7br",/*The Way I Still Love You*/
    "BV1VT4m1S7Cj",/*We Never*/
    "BV1dp4y1n7J4",/*Whale（鲸）*/
    "BV1LQ4y1M7z6",/*Whisper Of Hope*/
    "BV1iJgZerEYL",/*Windy Hill*/
    "BV1g54y1u74y",/*Whoa*/
    "BV1eS4y1v7Na",/*You*/
    "BV145QtYZEWx",/*Улеталиптицамигордыми*/
    "BV1aK411J7GF",/*ᐇ*/
    "BV17M4y1Q7pq",/*바람에 쓰는 편지*/
    "BV1hA4m137N1",/*デート*/
    "BV12x4y1x7r9",/*かたわれ時*/
    "BV1eC4y1S7MT",/*やわらかな光*/
];

// 随机选一个 bvid
const randomBvid = bvidList[Math.floor(Math.random() * bvidList.length)];

// 用户点击后插入随机视频
document.getElementById('splash-mask').onclick = function () {
    this.style.opacity = '0';
    setTimeout(() => {
        this.style.display = 'none';
        document.getElementById('bg-video').innerHTML = `
                <iframe 
                    src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${randomBvid}&autoplay=1&as_wide=1&t=0&danmaku=0"
                    frameborder="no"
                    scrolling="no"
                    allowfullscreen
                    allow="autoplay"
                    style="width:100vw;height:100vh;position:fixed;left:0;top:0;z-index:-2;pointer-events:none;filter:brightness(0.5);background:transparent;">
                </iframe>
                `;
    }, 500);
};


let videoKilled = false; //记录当前视频状态

document.getElementById('kill-video-btn').onclick = function () {
    const bgVideo = document.getElementById('bg-video');
    if (!videoKilled) {
        // 杀死视频
        bgVideo.innerHTML = '';
        this.innerHTML = '<i class="fas fa-play"></i>';
        this.title = '重新加载背景视频';
        videoKilled = true;
    } else {
        // 重新插入随机视频
        const randomBvid = bvidList[Math.floor(Math.random() * bvidList.length)];
        bgVideo.innerHTML = `
            <iframe 
                src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${randomBvid}&autoplay=1&as_wide=1&t=0&danmaku=0"
                frameborder="no"
                scrolling="no"
                allowfullscreen
                allow="autoplay"
                style="width:100vw;height:100vh;position:fixed;left:0;top:0;z-index:-2;pointer-events:none;filter:brightness(0.5);background:transparent;">
            </iframe>
        `;
        this.innerHTML = '<i class="fas fa-pause"></i>';
        this.title = '关闭背景视频';
        videoKilled = false;
    }
};

