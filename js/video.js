const bvidList = [
            "BV1CX4y1t7gA",/*骄傲的少年*/
            "BV1uw5Jz9EmK",/*晴天*/
            "BV1Zd4y1A7yc",/*妈妈的话*/
            "BV13G411Q76u",/*稻香*/
            "BV1Bv411E7uY",/*侧脸*/
            "BV1ESYBzuEUh",/*潮汐*/
            "BV1hW411v7GC",/*等你下课*/
            "BV1DRt2zuEbU",/*第57次取消发送*/
            "BV1BizJYtEek",/*冬眠2023*/
            "BV1NT2kBrEEN",/*堕(星火社)*/
            "BV1X34y1j7zZ",/*堕*/
            "BV19T411k7Tw",/*浮光*/
            "BV1Qp4y1R7MP",/*浮光(周深)*/
            "BV1E7411k7Qy",/*溯*/
            "BV1Y94y1R7Jn",/*龙卷风*/
            "BV1nu4y1o7pv",/*明天，你好*/
            "BV1u8yKYXEkj",/*罗生门(Follow)*/
            "BV1echreGEFM",/*暮色回响*/
            "BV1tW411b7G4",/*你从未离去*/
            "BV1r44y1L7YL",/*Been Through*/
            "BV1zf4y1d7L4",/*Between Worlds*/
            "BV1EM411R7rZ",/*Call of Silence (Clear Sky Remix)*/
            "BV1Xj411P7n1",/*Daylight*/
            "BV1Hm421E7Pa",/*Collapsing World*/
            "BV1xu411j7Aw",/*Counting Stars*/
            "BV1x5Tcz7EHB",/*Crashing Hard*/
            "BV15vkFYMEdw",/*Cry For Me (feat. Ami)*/
            "BV1V8ouYeEuR",/*DJ会呼吸的痛-0.9x纯享版*/
            "BV1km421G7rz",/*Down For Life (Phonk)*/
            "BV18381zqE3v",/*Ephemeral Memories*/
            "BV1cG4y117R9",/*Eutopia*/
            "BV13v4y1t7eh",/*Faded*/
            "BV1JP411H7ib",/*Fake love*/
            "BV1Xa4y1h7LT",/*Falling Again*/
            "BV1rK411T7Bc",/*Feeling The Rain*/
            "BV1yd4y1H7XP",/*Flower Dance*/
            "BV18H4y197mQ",/*Fool For You*/
            "BV1piSdY8Eo4",/*Go Again (feat. ELYSA)*/
            "BV1f6BqBPEr6",/*Good Time*/
            "BV1W4421S7jh",/*III*/
            "BV1fT4y137yU",/*所念皆星河*/
            "BV1fu4y1s7kj",/*Last Reunion*/
            "BV1uLoKYjEEr",/*Lemon*/
            "BV1RR4y1L76K",/*Let It Go*/
            "BV15Z4y1p7ML",/*Lifeline*/
            "BV1Bv4y1S7kC",/*Love Is Gone*/
            "BV1HB4y1q74L",/*【FREE】lucky*/
            "BV1zW4y1N7my",/*Melancholy*/
            "BV1ByB5BAEX6",/*Merry Christmas Mr. Lawrence*/
            "BV15G4y1X7pz",/*春风十里报新年*/
            "BV12o4y1J7sm",/*半山腰*/
            "BV1WU411f7hB",/*春娇与志明*/
            "BV1ES4y1R7XP",/*孤勇者*/
            "BV18N4y1Q71v",/*海の形*/
            "BV1kz4y1A7Rw",/*离别开出花*/
            "BV1XN4y1B7qq",/*下山*/
            "BV1tS4y1G7yt",/*你笑起来真好看*/
            "BV1nq4y1H7vi",/*青空*/
            "BV1De411p77r",/*少年*/
            "BV13v411V7Da",/*雾里*/
            "BV1qD421W7XN",/*我们*/
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

        // 杀死视频和声音按钮逻辑
        document.getElementById('kill-video-btn').onclick = function () {
            // 只清空视频容器，不影响音频
            document.getElementById('bg-video').innerHTML = '';
            // 隐藏按钮
            this.style.display = 'none';
        };