import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  applyXp, createStarterRoster, type NewCharacterRow, type ClassId,
} from '@barbrawl/game-core';
import type { Loot } from '@barbrawl/game-core';
import { portableStorage } from './storage';

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
}

export interface GameState {
  userId: string;
  gold: number;
  inventory: Loot.Item[];
  roster: CharacterRow[];
  activeIdx: number;
  /** equipped[classId][slot] → itemId. */
  equipped: Record<string, EquippedSlots>;
  claimedBars: ClaimedBar[];
  audioMuted: boolean;

  // selectors
  active: () => CharacterRow;
  defenderForBar: (barId: string) => ClaimedBar | undefined;

  // actions
  setActive: (idx: number) => void;
  allocateNode: (classId: ClassId, nodeId: string) => void;
  awardXp: (classId: ClassId, xp: number) => { levelsGained: number };
  addItem: (item: Loot.Item) => void;
  addGold: (g: number) => void;
  equipItem: (classId: ClassId, item: Loot.Item) => void;
  unequipSlot: (classId: ClassId, slot: Loot.ItemSlot) => void;
  consumeItem: (classId: ClassId, consumableId: string) => boolean;
  claimBar: (bar: { barId: string; theme: string; label: string }) => void;
  stationDefender: (barId: string, classId: ClassId) => void;
  unstationDefender: (barId: string) => void;
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
      inventory: [],
      roster: freshRoster(),
      activeIdx: 1, // default to Bouncer (index 1)
      equipped: {},
      claimedBars: [],
      audioMuted: false,

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
        set((s) => ({
          roster: s.roster.map((r) => {
            if (r.class_id !== classId) return r;
            const result = applyXp({ level: r.level, xpIntoLevel: r.xp }, xp);
            levelsGained = result.levelsGained;
            return { ...r, level: result.state.level, xp: result.state.xpIntoLevel };
          }),
        }));
        return { levelsGained };
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
          };
          return { claimedBars: [...s.claimedBars, claim] };
        });
      },

      stationDefender: (barId, classId) => {
        set((s) => ({
          claimedBars: s.claimedBars.map((b) => {
            // Pull the defender off any other bar (one defender per char).
            if (b.defenderClassId === classId && b.barId !== barId) {
              return { ...b, defenderClassId: null, stationedAtMs: null };
            }
            if (b.barId !== barId) return b;
            return { ...b, defenderClassId: classId, stationedAtMs: Date.now() };
          }),
        }));
      },

      unstationDefender: (barId) => {
        set((s) => ({
          claimedBars: s.claimedBars.map((b) =>
            b.barId === barId ? { ...b, defenderClassId: null, stationedAtMs: null } : b,
          ),
        }));
      },

      toggleMuted: () => {
        set((s) => ({ audioMuted: !s.audioMuted }));
      },

      resetDemo: () => {
        set({
          gold: 250, inventory: [], roster: freshRoster(), activeIdx: 1,
          equipped: {}, claimedBars: [], audioMuted: false,
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
        inventory: s.inventory,
        roster: s.roster,
        activeIdx: s.activeIdx,
        equipped: s.equipped,
        claimedBars: s.claimedBars,
        audioMuted: s.audioMuted,
      }),
    },
  ),
);
