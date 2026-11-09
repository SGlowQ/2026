namespace WishWinUI.Core;

/// <summary>
/// 抽卡核心：概率、双保底、UP/大保底、捕获明光。
/// 规则与时间线完全照搬原网页 js.js 的 drawOne()，
/// 只是把存在 localStorage 里的状态换成了 <see cref="WeekState"/>。
/// </summary>
public sealed class GachaEngine(HistoryStore store)
{
    public CharacterPool Pool { get; private set; } = null!;
    private WeekState _week = null!;
    private string? _weekKey;

    /// <summary>当前周状态。访问时自动检查是否跨周，跨了就从磁盘重新读。</summary>
    public WeekState Week
    {
        get
        {
            var key = store.CurrentWeekKey;
            if (_weekKey != key)
            {
                _weekKey = key;
                _week = store.Current;
            }
            return _week;
        }
    }

    public void AttachPool(CharacterPool pool) => Pool = pool;

    /// <summary>立即重新读取本周状态（切回祈愿页、清除记录后调用）。</summary>
    public void RefreshWeek()
    {
        _weekKey = store.CurrentWeekKey;
        _week = store.Current;
    }

    /// <summary>五星概率表：73 抽及以前固定 0.6%，74 抽起每抽 +6%，90 抽硬保底。</summary>
    public static double FiveStarChance(double pity)
    {
        if (pity < 74) return 0.006;
        return pity >= 90 ? 1.0 : 0.006 + (pity - 73) * 0.06;
    }

    /// <summary>
    /// 一次独立抽取：判定稀有度 → 判定名字（含 UP、大保底、捕获明光）→ 落盘。
    /// </summary>
    public DrawResult DrawOne()
    {
        // 名单为空时无法抽卡；调用方（WishPage）会先检查，这里再兜一道
        if (Pool.Count == 0)
        {
            throw new InvalidOperationException("名单为空，无法抽卡");
        }

        var week = Week;
        var random = Random.Shared;

        week.TotalDraws++;
        week.FiveStarPity++;
        week.FourStarPity++;

        int rarityIndex;
        double fiveStarChance = FiveStarChance(week.FiveStarPity);
        double rand = random.NextDouble();

        if (week.FiveStarPity >= 90)
        {
            rarityIndex = 0;
            week.FiveStarPity = 0;
            week.FourStarPity = 0;
        }
        else if (week.FourStarPity >= 10)
        {
            rarityIndex = 1;
            week.FourStarPity = 0;
        }
        else if (rand < fiveStarChance)
        {
            rarityIndex = 0;
            week.FiveStarPity = 0;
            week.FourStarPity = 0;
        }
        else if (rand < fiveStarChance + 0.051)
        {
            rarityIndex = 1;
            week.FourStarPity = 0;
        }
        else
        {
            rarityIndex = 2;
        }

        Character? winner;
        bool isUP = false;
        bool triggeredCaptureLight = false;

        if (rarityIndex == 0)
        {
            bool previousWasNonUp = week.LastFiveStarWasNonUp;
            bool guaranteedUp = week.IsGuaranteed5StarUP;
            bool captureLightForced = week.IsCaptureLightGuaranteed;

            if (guaranteedUp)
            {
                winner = Pool.FiveStarUP;
                isUP = true;
                week.IsGuaranteed5StarUP = false;
            }
            else if (captureLightForced)
            {
                winner = Pool.FiveStarUP;
                isUP = true;
                triggeredCaptureLight = true;
                week.IsCaptureLightGuaranteed = false;
                // 触发后计数器复位：先设 2，让下面统一的计数逻辑再 -1 回到 1
                week.CaptureLightCounter = 2;
            }
            else
            {
                if (random.NextDouble() < 0.5)
                {
                    winner = Pool.FiveStarUP;
                    isUP = true;
                }
                else
                {
                    var candidates = Pool.FiveStars.Where(c => c != Pool.FiveStarUP).ToList();
                    if (candidates.Count > 0)
                    {
                        winner = candidates[random.Next(candidates.Count)];
                        isUP = false;
                        week.IsGuaranteed5StarUP = true;
                    }
                    else
                    {
                        winner = Pool.FiveStarUP;
                        isUP = true;
                    }
                }
            }

            // UP / 非 UP 交替计数（捕获明光的触发条件）
            if (isUP && previousWasNonUp)
            {
                week.IsGuaranteed5StarUP = false;
            }
            else if (!isUP && !previousWasNonUp)
            {
                week.CaptureLightCounter += 1;
                if (week.CaptureLightCounter >= 3)
                {
                    week.IsCaptureLightGuaranteed = true;
                    week.CaptureLightCounter = 1;
                }
                week.IsGuaranteed5StarUP = true;
            }
            else if (isUP && !previousWasNonUp)
            {
                week.CaptureLightCounter = Math.Max(0, week.CaptureLightCounter - 1);
                week.IsGuaranteed5StarUP = false;
            }

            week.LastFiveStarWasNonUp = !isUP;
            week.FiveStarPity = 0;
            week.FourStarPity = 0;
        }
        else if (rarityIndex == 1)
        {
            week.FourStarPity = 0;
            var upList = Pool.FourStarUPs;

            if (week.IsGuaranteed4StarUP || random.NextDouble() < 0.5)
            {
                winner = upList[random.Next(upList.Count)];
                isUP = true;
                week.IsGuaranteed4StarUP = false;
            }
            else
            {
                var candidates = Pool.FourStars.Where(c => !upList.Contains(c)).ToList();
                if (candidates.Count > 0)
                {
                    winner = candidates[random.Next(candidates.Count)];
                    isUP = false;
                    week.IsGuaranteed4StarUP = true;
                }
                else
                {
                    winner = upList[random.Next(upList.Count)];
                    isUP = true;
                }
            }
        }
        else
        {
            // 三星：优先从三星池抽，三星池空了就从全体名单里抽
            var candidates = Pool.ThreeStars.Count > 0 ? Pool.ThreeStars : Pool.All;
            winner = candidates[random.Next(candidates.Count)];
        }

        // 理论上前面每个分支都会赋值；兜底防止名单异常导致 winner 为空
        if (winner == null)
        {
            winner = Pool.All.Count > 0 ? Pool.All[0] : throw new InvalidOperationException("角色池为空");
        }

        // 写入本周历史（最新的在最前面）
        var now = DateTime.Now;
        week.History.Insert(0, new HistoryRecord
        {
            Name = winner.Name,
            Rarity = rarityIndex,
            IsUP = isUP,
            TriggeredCaptureLight = triggeredCaptureLight,
            Date = HistoryStore.TodayText(now),
            Time = HistoryStore.NowText(now),
        });

        store.Save();

        return new DrawResult { Winner = winner, IsUP = isUP, TriggeredCaptureLight = triggeredCaptureLight };
    }
}
