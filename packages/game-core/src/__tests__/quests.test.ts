import {
  QUEST_CATALOG,
  pickDailyQuests,
  updateQuestProgress,
  claimQuest,
  freshQuestProgress,
  type BattleSummary,
  type QuestDef,
} from '../progression';

const baseSummary: BattleSummary = {
  won: true,
  barType: 'dive',
  barLevel: 10,
  playerLevel: 10,
  bossDefeated: false,
  perfectHits: 0,
  skillsUsed: 0,
  statusApplies: 0,
  consumablesUsed: 0,
  biggestHit: 0,
  roomsCleared: 5,
  endedHpPct: 0.5,
  goldEarned: 0,
};

describe('QUEST_CATALOG', () => {
  it('has at least 10 quests for variety', () => {
    expect(QUEST_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('XP rewards fall within spec §5.6 range (25-150)', () => {
    for (const q of QUEST_CATALOG) {
      expect(q.xpReward).toBeGreaterThanOrEqual(25);
      expect(q.xpReward).toBeLessThanOrEqual(150);
    }
  });

  it('every quest has a unique id', () => {
    const ids = new Set(QUEST_CATALOG.map((q) => q.id));
    expect(ids.size).toBe(QUEST_CATALOG.length);
  });
});

describe('pickDailyQuests', () => {
  it('returns exactly 3 quests', () => {
    const triple = pickDailyQuests('user_1', '2026-04-23');
    expect(triple.length).toBe(3);
  });

  it('is deterministic for same (user, date)', () => {
    const a = pickDailyQuests('user_1', '2026-04-23');
    const b = pickDailyQuests('user_1', '2026-04-23');
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it('rotates across days', () => {
    const a = pickDailyQuests('user_1', '2026-04-23');
    const b = pickDailyQuests('user_1', '2026-04-24');
    const aIds = a.map((q) => q.id).join(',');
    const bIds = b.map((q) => q.id).join(',');
    expect(aIds === bIds).toBe(false);
  });

  it('different users get different quests on the same day', () => {
    const a = pickDailyQuests('user_1', '2026-04-23');
    const b = pickDailyQuests('user_2', '2026-04-23');
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
  });

  it('picks unique quests (no duplicates in a triple)', () => {
    const triple = pickDailyQuests('user_xyz', '2026-04-23');
    const ids = new Set(triple.map((q) => q.id));
    expect(ids.size).toBe(3);
  });
});

describe('updateQuestProgress — accumulator quests', () => {
  it('boss_kills: increments on a winning boss fight', () => {
    const q: QuestDef = QUEST_CATALOG.find((x) => x.kind === 'boss_kills')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, bossDefeated: true });
    expect(p.progress).toBe(1);
    p = updateQuestProgress(q, p, { ...baseSummary, bossDefeated: true });
    expect(p.progress).toBe(2);
  });

  it('boss_kills: loss does not count', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'boss_kills')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, won: false, bossDefeated: true });
    expect(p.progress).toBe(0);
  });

  it('perfect_hits: adds summary count', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'perfect_hits')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, perfectHits: 7 });
    p = updateQuestProgress(q, p, { ...baseSummary, perfectHits: 3 });
    expect(p.progress).toBe(10);
    expect(p.completed).toBe(q.target <= 10);
  });

  it('no_consumable_wins: counts only clean wins', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'no_consumable_wins')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, consumablesUsed: 2 });
    expect(p.progress).toBe(0);
    p = updateQuestProgress(q, p, { ...baseSummary, consumablesUsed: 0 });
    expect(p.progress).toBe(1);
  });

  it('wins_of_type: respects bar type filter', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'wins_of_type' && x.barType === 'dive')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, barType: 'cocktail' });
    expect(p.progress).toBe(0);
    p = updateQuestProgress(q, p, { ...baseSummary, barType: 'dive' });
    expect(p.progress).toBe(1);
  });
});

describe('updateQuestProgress — threshold quests', () => {
  it('big_hit_damage: completes on reaching threshold', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'big_hit_damage')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, biggestHit: q.target - 1 });
    expect(p.completed).toBe(false);
    p = updateQuestProgress(q, p, { ...baseSummary, biggestHit: q.target });
    expect(p.completed).toBe(true);
    expect(p.progress).toBe(q.target);
  });

  it('fast_clear_rooms: needs a win in <= target rooms', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'fast_clear_rooms')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, won: true, roomsCleared: q.target + 2 });
    expect(p.completed).toBe(false);
    p = updateQuestProgress(q, p, { ...baseSummary, won: true, roomsCleared: q.target });
    expect(p.completed).toBe(true);
  });

  it('underdog_win: needs bar 5+ levels above', () => {
    const q = QUEST_CATALOG.find((x) => x.kind === 'underdog_win')!;
    let p = freshQuestProgress(q);
    p = updateQuestProgress(q, p, { ...baseSummary, won: true, barLevel: 11, playerLevel: 10 });
    expect(p.progress).toBe(0);
    p = updateQuestProgress(q, p, { ...baseSummary, won: true, barLevel: 15, playerLevel: 10 });
    expect(p.progress).toBe(1);
  });
});

describe('claimQuest', () => {
  it('rejects incomplete quests', () => {
    const q = QUEST_CATALOG[0]!;
    expect(() => claimQuest(q, freshQuestProgress(q))).toThrow();
  });

  it('rejects double-claim', () => {
    const q = QUEST_CATALOG[0]!;
    const done = { questId: q.id, progress: q.target, completed: true, claimed: true };
    expect(() => claimQuest(q, done)).toThrow();
  });

  it('awards xpReward and marks claimed on success', () => {
    const q = QUEST_CATALOG[0]!;
    const done = { questId: q.id, progress: q.target, completed: true, claimed: false };
    const { xpAwarded, updated } = claimQuest(q, done);
    expect(xpAwarded).toBe(q.xpReward);
    expect(updated.claimed).toBe(true);
  });
});
