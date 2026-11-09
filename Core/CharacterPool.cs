namespace WishWinUI.Core;

/// <summary>
/// 角色池：把名单按 五星:四星:三星 ≈ 1:8:53 划分，并在每次开池时随机抽取本期 UP。
/// 完全对应原网页 js.js 里的 createStarPools / pickUPs / 随机 UP 那一段。
/// </summary>
public sealed class CharacterPool
{
    // 权重 [五星, 四星, 三星]
    private static readonly int[] StarPoolWeights = [1, 8, 53];
    private static readonly int[] MinimumCounts = [1, 3, 0];
    private const int FourStarUPMax = 3;

    public List<Character> FiveStars { get; } = [];
    public List<Character> FourStars { get; } = [];
    public List<Character> ThreeStars { get; } = [];

    /// <summary>按星级索引拿卡池。</summary>
    public List<Character> this[int rarity] => rarity switch
    {
        0 => FiveStars,
        1 => FourStars,
        _ => ThreeStars,
    };

    /// <summary>洗牌后的完整名单（滚动展示栏用）。</summary>
    public List<Character> All { get; private set; } = [];

    public Character? FiveStarUP { get; private set; }
    public List<Character> FourStarUPs { get; private set; } = [];

    /// <summary>用一份纯名字构建角色池，并抽好本期 UP。</summary>
    public static CharacterPool Build(IReadOnlyList<string> names)
    {
        var pool = new CharacterPool();
        pool.Assign(names);
        pool.PickUPs();
        return pool;
    }

    /// <summary>
    /// 最大余数法把名单分配进三个星级池，然后做保底修正：
    /// 五星至少 1 人、四星至少 3 人，不够就从有富余的池里调人过来。
    /// </summary>
    private void Assign(IReadOnlyList<string> names)
    {
        var clean = names.Select(n => (n ?? string.Empty).Trim()).Where(n => n.Length > 0).ToList();
        Shuffle(clean);

        var decorated = clean.Select(n => new Character(n, 2, ElementStyle.Random())).ToList();
        int total = decorated.Count;
        int totalWeight = StarPoolWeights.Sum();

        var counts = StarPoolWeights.Select(w => (int)Math.Floor((double)total * w / totalWeight)).ToArray();
        var remainders = StarPoolWeights
            .Select((w, i) => (Index: i, Remainder: (double)total * w / totalWeight - counts[i]))
            .ToList();
        int remaining = total - counts.Sum();

        remainders.Sort((l, r) => r.Remainder.CompareTo(l.Remainder));
        for (int i = 0; i < remaining && remainders.Count > 0; i++)
        {
            counts[remainders[i % remainders.Count].Index]++;
        }

        for (int i = 0; i < MinimumCounts.Length; i++)
        {
            while (counts[i] < MinimumCounts[i] && counts.Sum() <= total)
            {
                int donor = -1;
                for (int c = 0; c < counts.Length; c++)
                {
                    if (c != i && counts[c] > MinimumCounts[c]) { donor = c; break; }
                }
                if (donor < 0) break;
                counts[donor]--;
                counts[i]++;
            }
        }

        // 注意：Character 的星级是创建时写死的，分配到这里必须按池重建对象，
        // 否则所有人都还是初始化时的三星（曾经导致五星 UP 显示成紫色、抽卡星级也不对）。
        int cursor = 0;
        FiveStars.Clear();
        FourStars.Clear();
        ThreeStars.Clear();
        for (int i = 0; i < counts[0] && cursor < decorated.Count; i++)
        {
            FiveStars.Add(new Character(decorated[cursor].Name, 0, decorated[cursor].Element));
            cursor++;
        }
        for (int i = 0; i < counts[1] && cursor < decorated.Count; i++)
        {
            FourStars.Add(new Character(decorated[cursor].Name, 1, decorated[cursor].Element));
            cursor++;
        }
        for (; cursor < decorated.Count; cursor++)
        {
            ThreeStars.Add(new Character(decorated[cursor].Name, 2, decorated[cursor].Element));
        }

        // 全体名单 = 三个池按顺序拼起来，保证每个人带着正确的星级
        All = FiveStars.Concat(FourStars).Concat(ThreeStars).ToList();
    }

    /// <summary>每开一次池重新抽 UP：五星 1 名，四星最多 3 名（不会重复）。</summary>
    private void PickUPs()
    {
        // 名单为空时什么都不选，避免 First() 抛异常
        if (All.Count == 0)
        {
            FiveStarUP = null;
            FourStarUPs = [];
            return;
        }

        FiveStarUP = (FiveStars.Count > 0 ? TakeRandom(FiveStars, 1).FirstOrDefault() : null)
                     ?? TakeRandom(All, 1).First();
        FourStarUPs = TakeRandom(FourStars, Math.Min(FourStarUPMax, FourStars.Count));
    }

    /// <summary>某个角色是不是本期 UP。</summary>
    public bool IsUP(Character c) => c == FiveStarUP || FourStarUPs.Contains(c);

    /// <summary>名单一共多少人。</summary>
    public int Count => All.Count;

    public static List<Character> TakeRandom(IReadOnlyList<Character> source, int count)
    {
        var copy = source.ToList();
        var result = new List<Character>();
        for (int i = 0; i < count && copy.Count > 0; i++)
        {
            int idx = System.Random.Shared.Next(copy.Count);
            result.Add(copy[idx]);
            copy.RemoveAt(idx);
        }
        return result;
    }

    public static void Shuffle<T>(IList<T> list)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = System.Random.Shared.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
