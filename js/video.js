const bvidList = [
            "BV1dUtKerEoj",/*❀*/
            "BV1Nna2zMEKa",/*沉海*/
            "BV1Sv411p7Ap",/*浮光*/
            "BV1C24y1C7NK",/*海の形*/
            "BV1SV41137gu",/*和煦的糖果风*/
            "BV1bAS3Y5ELB",/*寂静之空*/
            "BV1wY4y1Q7TY",/*卡农*/
            "BV1cM4y1r7n1",/*面会菜*/
            "BV1Y7sgeBEG9",/*末日出逃*/
            "BV1nq4y1H7vi",/*青空*/
            "BV1fT4y137yU",/*所念皆星河*/
            "BV1zhpRzFE4b",/*星茶会*/
            "BV1UY4y1x7do",/*银河赴约*/
            "BV1ym411B7Li",/*宇宙尽头的碎片*/
            "BV1Tg411b7jH",/*Ahead of Us*/
            "BV1pK4y1C7B8",/*Alpha*/
            "BV1FG411M7SC",/*Anomaly*/
            "BV1cs411v7dU",/*Between Worlds*/
            "BV1Nx411D7Fd",/*Cocoon*/
            "BV1KPF4zvE1c",/*Collapsing World*/
            "BV1Xj411P7n1",/*Daylight*/
            "BV1sP4y1R7wV",/*Deep Blue*/
            "BV1KX4y1h7jp",/*Dont Wake Me Up*/
            "BV1M7411j7jv",/*Ephemeral Memories*/
            "BV1SG411j7wk",/*Eutopia*/
            "BV1MW411b7mK",/*Feeling The Rain*/
            "BV1rG4y177Ad",/*the Garden of Escapism*/
            "BV1HW41197iY",/*Grace（惊鸿）*/
            "BV1bT421U7ui",/*Green to Blue (Sped Up)*/
            "BV1JN4y1q7vH",/*Grief*/
            "BV14L411G7Hk",/*Haggstrom*/
            "BV18s411c7yF",/*Heart linked(心弦）*/
            "BV1qh4y1Y7CL",/*His Theme*/
            "BV16H4y1m797",/*it's 6pm but I miss u already*/
            "BV1Lb4y1J7CP",/*Last Reunion*/
            "BV15Z4y1p7ML",/*Lifeline*/
            "BV1Xm4y1U7fo",/*Love You Three 3000*/
            "BV1HB4y1q74L",/*Lucky*/
            "BV13d4y1K7Q2",/*May I See U Again*/
            "BV1oK411q7mp",/*Merry Christmas Mr.Lawrence*/
            "BV1s441117W9",/*My Soul*/
            "BV13T421D7Wg",/*Patience*/
            "BV1Ws411a7To",/*River Flows in You*/
            "BV1az4y1J7gZ",/*Sacred Play Secret Place*/
            "BV1Pz421i7Zb",/*Somewhere*/
            "BV1xg4y137UB",/*Take Me Somewhere Far Away From Here*/
            "BV1Ag41147Ws",/*The Truth That You Leave*/
            "BV1VM411w7W9",/*Time Stop*/
            "BV1w8411D7HE",/*Towards the Light*/
            "BV1dp4y1n7J4",/*Whale（鲸）*/
            "BV1LQ4y1M7z6",/*Whisper Of Hope*/
            "BV1iJgZerEYL",/*Windy Hill*/
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
            <iframe class="video-iframe"
                src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${randomBvid}&autoplay=1&as_wide=1&t=0&danmaku=0"
                frameborder="no"
                scrolling="no"
                allowfullscreen
                allow="autoplay">
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
            <iframe class="video-iframe"
                src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${randomBvid}&autoplay=1&as_wide=1&t=0&danmaku=0"
                frameborder="no"
                scrolling="no"
                allowfullscreen
                allow="autoplay">
            </iframe>
        `;
        this.innerHTML = '<i class="fas fa-pause"></i>';
        this.title = '关闭背景视频';
        videoKilled = false;
    }

};

