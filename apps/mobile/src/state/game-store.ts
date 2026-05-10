import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  applyXp, createStarterRoster, Events, Progression,
  type NewCharacterRow, type ClassId,
} from '@barbrawl/game-core';
import type { Loot } from '@barbrawl/game-core';
import { portableStorage } from './storage';

const { applyLogin, freshStreak } = Events;
const { pickDailyQuests, freshQuestProgress, updateQuestProgress, claimQuest } = Progression;
type LoginStreakState = ReturnType<typeof freshStreak>;
type LoginReward = ReturnType<typeof applyLogin>['rewards'][number];
type QuestDef = ReturnType<typeof pickDailyQuests>[number];
type QuestProgress = ReturnType<typeof freshQuestProgress>;
type BattleSummary = Parameters<typeof updateQuestProgress>[2];

// Persistent game state. Survives reload via localStorage on web; swap
// to AsyncStorage on native by editing storage.ts (one-line change).

const DEMO_USER_ID = 'demo-user';
const STORAGE_KEY = 'barbrawl/state/v1';
const SCHEMA_VERSION = 1;

type CharacterRow = NewCharacterRow;

/** Per-character equipped slot map. Stores item IDs that resolve via inventory[]. */
export type EquippedSlots = Partial<Record<Loot.ItemSlot, string>>;

/** A bar claimed by the player after a victory. */
export interface ClaimedBar {
  barId: string;
  theme: string;
  label: string;
  /** Class id of the stationed defender, or null if undefended. */
  defenderClassId: ClassId | null;
  /** When the bar was first claimed (ms epoch). */
  claimedAtMs: number;
  /** When the current defender was stationed. */
  stationedAtMs: number | null;
  /** Snapshot of the defender's max HP at station time (for decay calc). */
  defenderMaxHp: number;
  /** Last time coins were claimed from this bar (resets accrual). */
  coinsClaimedAtMs: number | null;
}

export interface DailyQuestState {
  /** Local YYYY-MM-DD when these quests were rolled. */
  dateKey: string;
  /** 3 picked quests for today. */
  picks: readonly [QuestDef, QuestDef, QuestDef];
  /** Per-quest-id progress record. */
  progress: Record<string, QuestProgress>;
}

export interface GameState {
  userId: string;
  gold: number;
  respecTokens: number;
  inventory: Loot.Item[];
  roster: CharacterRow[];
  activeIdx: number;
  /** equipped[classId][slot] → itemId. */
  equipped: Record<string, EquippedSlots>;
  claimedBars: ClaimedBar[];
  audioMuted: boolean;
  loginStreak: LoginStreakState;
  /** Most recent login rewards — UI shows them once and clears. */
  pendingLoginRewards: readonly LoginReward[];
  dailyQuests: DailyQuestState | null;
  /** Total XP earned across all characters — feeds Crawl Pass tier. */
  crawlPassXp: number;
  /** Resistance Mark IDs the player owns. Tier 4+ entries require matching mark. */
  marks: readonly string[];
  /** Per-bar lifetime + daily clear counts.
   *  total = ever; today = { dateKey, count } resetting at local midnight. */
  barClears: Record<string, { total: number; today: { dateKey: string; count: number } }>;
  /** Snapshot of the most recent battle for the /replay viewer. */
  lastBattle: {
    barLabel: string;
    theme: string;
    result: 'win' | 'loss' | 'flee';
    classId: string;
    log: { turn: number; actorId: string; kind: string; text: string }[];
    finishedAtMs: number;
  } | null;

  // selectors
  active: () => CharacterRow;
  defenderForBar: (barId: string) => ClaimedBar | undefined;

  // actions
  setActive: (idx: number) => void;
  allocateNode: (classId: ClassId, nodeId: string) => void;
  awardXp: (classId: ClassId, xp: number) => { levelsGained: number };
  bumpMastery: (classId: ClassId, barType: string) => void;
  /** Add a Resistance Mark id. Returns true if newly added, false if already owned. */
  earnMark: (markId: string) => boolean;
  /** Remove an item from inventory and award scaled gold (ilvl × rarity). */
  sellItem: (itemId: string) => number;
  /**
   * Record a bar clear. Returns metadata the rewards screen surfaces:
   * which clear-of-day this was (1, 2, 3+) and whether it was the
   * first ever clear of this bar.
   */
  recordBarClear: (barId: string) => { clearNumberToday: number; firstEverClear: boolean };
  saveLastBattle: (snapshot: NonNullable<GameState['lastBattle']>) => void;
  /** Reset all allocations on a character. Cost: level² gold or 1 token. */
  respecCharacter: (classId: ClassId, useToken: boolean) =>
    | { ok: true; goldSpent: number; tokensSpent: number }
    | { ok: false; reason: string };
  addItem: (item: Loot.Item) => void;
  addGold: (g: number) => void;
  equipItem: (classId: ClassId, item: Loot.Item) => void;
  unequipSlot: (classId: ClassId, slot: Loot.ItemSlot) => void;
  consumeItem: (classId: ClassId, consumableId: string) => boolean;
  claimBar: (bar: { barId: string; theme: string; label: string }) => void;
  stationDefender: (barId: string, classId: ClassId, defenderMaxHp: number) => void;
  unstationDefender: (barId: string) => void;
  collectBarCoins: (barId: string) => number;
  registerLogin: () => void;
  clearLoginRewards: () => void;
  rollDailyQuestsIfNeeded: () => void;
  applyBattleToQuests: (summary: BattleSummary) => void;
  claimDailyQuest: (questId: string) => boolean;
  toggleMuted: () => void;
  resetDemo: () => void;
}

// Starter stash so demo players have something to use on the ITEM button.
const STARTER_CONSUMABLES: Readonly<Record<string, number>> = Object.freeze({
  small_brew: 2,
  house_special: 1,
  shot_of_courage: 1,
  iron_tonic: 1,
  focus_vial: 1,
  emergency_elixir: 1,
  palette_cleanser: 1,
});

function freshRoster(): CharacterRow[] {
  return createStarterRoster(DEMO_USER_ID).map((r) => ({
    ...r,
    allocated_nodes: [...r.allocated_nodes],
    inventory: [...r.inventory],
    equipped: { ...r.equipped },
    consumables: { ...STARTER_CONSUMABLES },
    mastery: { ...r.mastery },
  }));
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      userId: DEMO_USER_ID,
      gold: 250,
      respecTokens: 5,
      inventory: [],
      roster: freshRoster(),
      activeIdx: 1, // default to Bouncer (index 1)
      equipped: {},
      claimedBars: [],
      audioMuted: false,
      loginStreak: freshStreak(),
      pendingLoginRewards: [],
      dailyQuests: null,
      crawlPassXp: 0,
      marks: [],
      barClears: {},
      lastBattle: null,

      active: () => get().roster[get().activeIdx]!,
      defenderForBar: (barId) => get().claimedBars.find((b) => b.barId === barId),

      setActive: (idx) => {
        const max = get().roster.length;
        if (idx < 0 || idx >= max) return;
        set({ activeIdx: idx });
      },

      allocateNode: (classId, nodeId) => {
        set((s) => ({
          roster: s.roster.map((r) => {
            if (r.class_id !== classId) return r;
            if (r.allocated_nodes.includes(nodeId)) return r;
            // Skill point cap: 1 SP per level. Refuse beyond level.
            if (r.allocated_nodes.length >= r.level) return r;
            return { ...r, allocated_nodes: [...r.allocated_nodes, nodeId] };
          }),
        }));
      },

      awardXp: (classId, xp) => {
        let levelsGained = 0;
        set((s) => {
          let tokensGranted = 0;
          const nextRoster = s.roster.map((r) => {
            if (r.class_id !== classId) return r;
            const result = applyXp({ level: r.level, xpIntoLevel: r.xp }, xp);
            levelsGained = result.levelsGained;
            tokensGranted = Progression.respecTokensFromLevelUp(r.level, result.state.level);
            return { ...r, level: result.state.level, xp: result.state.xpIntoLevel };
          });
          return {
            roster: nextRoster,
            respecTokens: s.respecTokens + tokensGranted,
            crawlPassXp: s.crawlPassXp + xp,
          };
        });
        return { levelsGained };
      },

      respecCharacter: (classId, useToken) => {
        const s = get();
        const row = s.roster.find((r) => r.class_id === classId);
        if (!row) return { ok: false, reason: 'no_char' };
        const result = Progression.applyRespec({
          level: row.level,
          allocatedNodes: row.allocated_nodes,
          goldBalance: s.gold,
          tokenBalance: s.respecTokens,
          useToken,
        });
        if (!result.ok) return { ok: false, reason: result.reason };
        set((st) => ({
          gold: result.goldBalance,
          respecTokens: result.tokenBalance,
          roster: st.roster.map((r) =>
            r.class_id === classId ? { ...r, allocated_nodes: [] } : r,
          ),
        }));
        return { ok: true, goldSpent: result.goldSpent, tokensSpent: result.tokensSpent };
      },

      bumpMastery: (classId, barType) => {
        set((s) => ({
          roster: s.roster.map((r) => {
            if (r.class_id !== classId) return r;
            const m = { ...(r.mastery as Record<string, number>) };
            m[barType] = (m[barType] ?? 0) + 1;
            return { ...r, mastery: m, bars_won: r.bars_won + 1 };
          }),
        }));
      },

      earnMark: (markId) => {
        const s = get();
        if (s.marks.includes(markId)) return false;
        set((st) => ({ marks: [...st.marks, markId] }));
        return true;
      },

      sellItem: (itemId) => {
        const s = get();
        const item = s.inventory.find((it) => it.id === itemId);
        if (!item) return 0;
        const RARITY_MULT: Record<string, number> = {
          common: 1, uncommon: 2, rare: 5, epic: 12, legendary: 30,
        };
        const price = Math.max(1, Math.floor(item.ilvl * (RARITY_MULT[item.rarity] ?? 1)));
        set((st) => {
          // Also unequip if equipped on any character.
          const equipped = { ...st.equipped };
          for (const cid of Object.keys(equipped)) {
            const slots = { ...equipped[cid] };
            for (const slot of Object.keys(slots) as Loot.ItemSlot[]) {
              if (slots[slot] === itemId) delete slots[slot];
            }
            equipped[cid] = slots;
          }
          return {
            inventory: st.inventory.filter((it) => it.id !== itemId),
            gold: st.gold + price,
            equipped,
          };
        });
        return price;
      },

      recordBarClear: (barId) => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        const prior = s.barClears[barId];
        const firstEverClear = !prior || prior.total === 0;
        const clearsToday = prior?.today.dateKey === today ? prior.today.count : 0;
        const clearNumberToday = clearsToday + 1;
        const next = {
          total: (prior?.total ?? 0) + 1,
          today: { dateKey: today, count: clearNumberToday },
        };
        set((st) => ({ barClears: { ...st.barClears, [barId]: next } }));
        return { clearNumberToday, firstEverClear };
      },

      saveLastBattle: (snapshot) => {
        set({ lastBattle: snapshot });
      },

      addItem: (item) => {
        set((s) => ({ inventory: [...s.inventory, item] }));
      },

      addGold: (g) => {
        set((s) => ({ gold: s.gold + g }));
      },

      equipItem: (classId, item) => {
        set((s) => ({
          equipped: {
            ...s.equipped,
            [classId]: { ...(s.equipped[classId] ?? {}), [item.slot]: item.id },
          },
        }));
      },

      unequipSlot: (classId, slot) => {
        set((s) => {
          const cur = { ...(s.equipped[classId] ?? {}) };
          delete cur[slot];
          return { equipped: { ...s.equipped, [classId]: cur } };
        });
      },

      consumeItem: (classId, consumableId) => {
        const s = get();
        const row = s.roster.find((r) => r.class_id === classId);
        if (!row) return false;
        const count = (row.consumables as Record<string, number>)[consumableId] ?? 0;
        if (count <= 0) return false;
        set((st) => ({
          roster: st.roster.map((r) => {
            if (r.class_id !== classId) return r;
            const next = { ...(r.consumables as Record<string, number>) };
            const newCount = (next[consumableId] ?? 0) - 1;
            if (newCount <= 0) delete next[consumableId];
            else next[consumableId] = newCount;
            return { ...r, consumables: next };
          }),
        }));
        return true;
      },

      claimBar: (bar) => {
        set((s) => {
          if (s.claimedBars.some((b) => b.barId === bar.barId)) return s;
          const claim: ClaimedBar = {
            barId: bar.barId,
            theme: bar.theme,
            label: bar.label,
            defenderClassId: null,
            claimedAtMs: Date.now(),
            stationedAtMs: null,
            defenderMaxHp: 0,
            coinsClaimedAtMs: null,
          };
          return { claimedBars: [...s.claimedBars, claim] };
        });
      },

      stationDefender: (barId, classId, defenderMaxHp) => {
        const now = Date.now();
        set((s) => ({
          claimedBars: s.claimedBars.map((b) => {
            // Pull the defender off any other bar (one defender per char).
            if (b.defenderClassId === classId && b.barId !== barId) {
              return { ...b, defenderClassId: null, stationedAtMs: null, coinsClaimedAtMs: null };
            }
            if (b.barId !== barId) return b;
            return {
              ...b,
              defenderClassId: classId,
              stationedAtMs: now,
              defenderMaxHp,
              coinsClaimedAtMs: now,
            };
          }),
        }));
      },

      unstationDefender: (barId) => {
        set((s) => ({
          claimedBars: s.claimedBars.map((b) =>
            b.barId === barId
              ? { ...b, defenderClassId: null, stationedAtMs: null, coinsClaimedAtMs: null }
              : b,
          ),
        }));
      },

      collectBarCoins: (barId) => {
        const s = get();
        const bar = s.claimedBars.find((b) => b.barId === barId);
        if (!bar || !bar.stationedAtMs) return 0;
        const since = bar.coinsClaimedAtMs ?? bar.stationedAtMs;
        const hours = Math.max(0, (Date.now() - since) / (1000 * 60 * 60));
        // 2/hr, capped at 75 across the account per day. Simple per-bar
        // local cap for now: 75/day * (hours/24).
        const raw = Math.floor(2 * hours);
        const dailyLimit = Math.floor((hours / 24) * 75);
        const earned = Math.min(raw, dailyLimit);
        if (earned <= 0) return 0;
        set((st) => ({
          gold: st.gold + earned,
          claimedBars: st.claimedBars.map((b) =>
            b.barId === barId ? { ...b, coinsClaimedAtMs: Date.now() } : b,
          ),
        }));
        return earned;
      },

      toggleMuted: () => {
        set((s) => ({ audioMuted: !s.audioMuted }));
      },

      registerLogin: () => {
        const s = get();
        const result = applyLogin(s.loginStreak);
        if (!result.isNewDay) return;
        // Apply gold rewards immediately. Other rewards stay in pending so
        // the UI can show a "you earned X" panel once.
        let goldDelta = 0;
        const consumableDeltas: Record<string, number> = {};
        for (const r of result.rewards) {
          if (r.kind === 'gold') goldDelta += r.amount;
          if (r.kind === 'consumable' && r.itemId) {
            consumableDeltas[r.itemId] = (consumableDeltas[r.itemId] ?? 0) + r.amount;
          }
        }
        set((st) => ({
          loginStreak: result.state,
          pendingLoginRewards: result.rewards,
          gold: st.gold + goldDelta,
          // Drop streak consumables into every character's stash.
          roster: st.roster.map((r) => {
            const m = { ...(r.consumables as Record<string, number>) };
            for (const [id, n] of Object.entries(consumableDeltas)) {
              m[id] = (m[id] ?? 0) + n;
            }
            return { ...r, consumables: m };
          }),
        }));
      },

      clearLoginRewards: () => set({ pendingLoginRewards: [] }),

      rollDailyQuestsIfNeeded: () => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        if (s.dailyQuests && s.dailyQuests.dateKey === today) return;
        const picks = pickDailyQuests(s.userId, today);
        const progress: Record<string, QuestProgress> = {};
        for (const q of picks) progress[q.id] = freshQuestProgress(q);
        set({ dailyQuests: { dateKey: today, picks, progress } });
      },

      applyBattleToQuests: (summary) => {
        const s = get();
        if (!s.dailyQuests) return;
        const next = { ...s.dailyQuests.progress };
        for (const def of s.dailyQuests.picks) {
          const prior = next[def.id] ?? freshQuestProgress(def);
          next[def.id] = updateQuestProgress(def, prior, summary);
        }
        set({ dailyQuests: { ...s.dailyQuests, progress: next } });
      },

      claimDailyQuest: (questId) => {
        const s = get();
        if (!s.dailyQuests) return false;
        const def = s.dailyQuests.picks.find((q) => q.id === questId);
        const prog = s.dailyQuests.progress[questId];
        if (!def || !prog || !prog.completed || prog.claimed) return false;
        const { xpAwarded, updated } = claimQuest(def, prog);
        const active = s.roster[s.activeIdx];
        if (!active) return false;
        const xpRes = applyXp({ level: active.level, xpIntoLevel: active.xp }, xpAwarded);
        set((st) => ({
          dailyQuests: st.dailyQuests
            ? { ...st.dailyQuests, progress: { ...st.dailyQuests.progress, [questId]: updated } }
            : st.dailyQuests,
          roster: st.roster.map((r, i) =>
            i === st.activeIdx
              ? { ...r, level: xpRes.state.level, xp: xpRes.state.xpIntoLevel }
              : r,
          ),
        }));
        return true;
      },

      resetDemo: () => {
        set({
          gold: 250, respecTokens: 5, inventory: [], roster: freshRoster(), activeIdx: 1,
          equipped: {}, claimedBars: [], audioMuted: false,
          loginStreak: freshStreak(), pendingLoginRewards: [], dailyQuests: null,
          crawlPassXp: 0, marks: [], barClears: {}, lastBattle: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => portableStorage),
      // Don't persist function/method members.
      partialize: (s) => ({
        userId: s.userId,
        gold: s.gold,
        respecTokens: s.respecTokens,
        inventory: s.inventory,
        roster: s.roster,
        activeIdx: s.activeIdx,
        equipped: s.equipped,
        claimedBars: s.claimedBars,
        audioMuted: s.audioMuted,
        loginStreak: s.loginStreak,
        dailyQuests: s.dailyQuests,
        crawlPassXp: s.crawlPassXp,
        marks: s.marks,
        barClears: s.barClears,
        lastBattle: s.lastBattle,
      }),
    },
  ),
);
