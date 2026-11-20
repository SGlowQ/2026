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

    /// <summary>
    /// 五星概率表：73 抽及以前固定 0.6%，74 抽起每抽 +6%，90 抽硬保底。
    /// 与网页版 js.js 的 getFiveStarChance 表完全一致（74=6.6% → 89=96.6% → 90=100%）。
    /// </summary>
    public static double FiveStarChance(double pity)
    {
        if (pity < 74) return 0.006;
        if (pity >= 90) return 1.0;
        // 74 抽 → 6.6%，此后每抽 +6%
        return 0.006 + (pity - 73) * 0.06;
    }

    /// <summary>
    /// 捕获明光的抢救概率：小保底歪了之后，有 10% 的几率被明光改判成 UP。
    ///
    /// 官方公示的综合 UP 率 55% 由此得出：
    ///     50%（直接 UP）+ 50%（歪）× 10%（明光抢救）= 55%
    /// 注意这个 55% 指的是「小保底」阶段的 UP 率，大保底不计入这个口径。
    /// </summary>
    private const double CaptureLightRescueChance = 0.10;

    /// <summary>
    /// 连续三次「第二次才拿到 UP」后，下一次五星必定触发捕获明光（官方硬保底）。
    /// </summary>
    private const int CaptureLightHardPity = 3;

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
            bool guaranteedUp = week.IsGuaranteed5StarUP;

            if (guaranteedUp)
            {
                // 大保底：上次五星非 UP，这次必定是 UP。
                // 这属于「第二次才拿到 UP」，把连败计数 +1（官方计数规则）。
                winner = Pool.FiveStarUP;
                isUP = true;
                week.IsGuaranteed5StarUP = false;
                week.LastFiveStarWasNonUp = false;

                week.CaptureLightCounter += 1;
                if (week.CaptureLightCounter >= CaptureLightHardPity)
                {
                    week.IsCaptureLightGuaranteed = true;
                    week.CaptureLightCounter = 0;
                }
            }
            else
            {
                // 小保底：官方算法是「先判打不打明光，再判歪不歪」
                //
                //   小保底出五星时：
                //     50% 直接 UP
                //     50% 歪 → 其中 10% 几率被捕获明光抢救成 UP
                //   综合 = 50% + 50% × 10% = 55%   ← 官方公示的 55% 就是这个
                //
                // 明光只在小保底生效，大保底不受影响（官方原文明确）。
                bool captureLight = false;

                if (week.IsCaptureLightGuaranteed)
                {
                    // 连续三次「第二次才拿到 UP」后，这一发必定明光（官方硬保底）
                    captureLight = true;
                    week.IsCaptureLightGuaranteed = false;
                }
                else if (random.NextDouble() < 0.5)
                {
                    // 先走 50% 的「歪」分支，其中 10% 被明光抢救
                    captureLight = random.NextDouble() < CaptureLightRescueChance;
                }

                if (captureLight)
                {
                    winner = Pool.FiveStarUP;
                    isUP = true;
                    triggeredCaptureLight = true;
                    week.IsGuaranteed5StarUP = false;
                    week.LastFiveStarWasNonUp = false;
                    // 明光相当于「小保底没歪」，打断连败
                    week.CaptureLightCounter = 0;
                }
                else
                {
                    // 普通判定：50% 基础概率为 UP
                    if (random.NextDouble() < 0.5)
                    {
                        winner = Pool.FiveStarUP;
                        isUP = true;
                        week.IsGuaranteed5StarUP = false;
                        week.LastFiveStarWasNonUp = false;
                        // 首次就是 UP，打断连败
                        week.CaptureLightCounter = 0;
                    }
                    else
                    {
                        var candidates = Pool.FiveStars.Where(c => c != Pool.FiveStarUP).ToList();
                        if (candidates.Count > 0)
                        {
                            winner = candidates[random.Next(candidates.Count)];
                            isUP = false;
                            // 歪了：激活大保底
                            week.IsGuaranteed5StarUP = true;
                            week.LastFiveStarWasNonUp = true;
                        }
                        else
                        {
                            // 池子里只有 UP，退化成 UP
                            winner = Pool.FiveStarUP;
                            isUP = true;
                            week.IsGuaranteed5StarUP = false;
                            week.LastFiveStarWasNonUp = false;
                            week.CaptureLightCounter = 0;
                        }
                    }
                }
            }

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
