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

export interface GameState {
  userId: string;
  gold: number;
  inventory: Loot.Item[];
  roster: CharacterRow[];
  activeIdx: number;

  // selectors
  active: () => CharacterRow;

  // actions
  setActive: (idx: number) => void;
  allocateNode: (classId: ClassId, nodeId: string) => void;
  awardXp: (classId: ClassId, xp: number) => { levelsGained: number };
  addItem: (item: Loot.Item) => void;
  addGold: (g: number) => void;
  resetDemo: () => void;
}

function freshRoster(): CharacterRow[] {
  return createStarterRoster(DEMO_USER_ID).map((r) => ({
    ...r,
    allocated_nodes: [...r.allocated_nodes],
    inventory: [...r.inventory],
    equipped: { ...r.equipped },
    consumables: { ...r.consumables },
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

      active: () => get().roster[get().activeIdx]!,

      setActive: (idx) => {
        const max = get().roster.length;
        if (idx < 0 || idx >= max) return;
        set({ activeIdx: idx });
      },

      allocateNode: (classId, nodeId) => {
        set((s) => ({
          roster: s.roster.map((r) =>
            r.class_id !== classId
              ? r
              : r.allocated_nodes.includes(nodeId)
                ? r
                : { ...r, allocated_nodes: [...r.allocated_nodes, nodeId] },
          ),
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

      resetDemo: () => {
        set({ gold: 250, inventory: [], roster: freshRoster(), activeIdx: 1 });
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
      }),
    },
  ),
);
