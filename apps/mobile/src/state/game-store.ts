import { create } from 'zustand';
import {
  applyXp, createStarterRoster, type NewCharacterRow, type ClassId,
} from '@barbrawl/game-core';
import type { Loot } from '@barbrawl/game-core';

// In-memory game state. v1 doesn't persist — Phase 14 will add AsyncStorage
// persistence + Supabase sync. Lives long enough across screens that battles
// + tree allocations actually persist while the demo is open.

const DEMO_USER_ID = 'demo-user';

type CharacterRow = NewCharacterRow & {
  // game-core's NewCharacterRow uses `consumables` as a count map. We don't
  // need anything else here — it's the row shape ready for DB write.
};

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
  // game-core returns readonly NewCharacterRow[]. Spread to mutable for state.
  return createStarterRoster(DEMO_USER_ID).map((r) => ({
    ...r,
    allocated_nodes: [...r.allocated_nodes],
    inventory: [...r.inventory],
    equipped: { ...r.equipped },
    consumables: { ...r.consumables },
    mastery: { ...r.mastery },
  }));
}

export const useGameStore = create<GameState>((set, get) => ({
  userId: DEMO_USER_ID,
  gold: 250,
  inventory: [],
  roster: freshRoster(),
  activeIdx: 1, // default to Bouncer (index 1) for the demo

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
}));
