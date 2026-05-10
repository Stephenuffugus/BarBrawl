// Cross-platform key/value storage adapter for Zustand persist middleware.
//
// Web: globalThis.localStorage — works in browsers + Expo web + jsdom.
// Native: in-memory Map fallback. AsyncStorage swap is a one-line change
//   when @react-native-async-storage/async-storage is added as a dep.
//
// Adheres to Zustand's StateStorage interface (sync getItem/setItem/
// removeItem returning string | null | Promise<string | null>).

import type { StateStorage } from 'zustand/middleware';

const memoryStore = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof globalThis !== 'undefined'
      && typeof (globalThis as { localStorage?: Storage }).localStorage !== 'undefined';
  } catch { return false; }
}

const localStorage = hasLocalStorage()
  ? (globalThis as unknown as { localStorage: Storage }).localStorage
  : null;

export const portableStorage: StateStorage = {
  getItem: (name) => {
    if (localStorage) return localStorage.getItem(name);
    return memoryStore.get(name) ?? null;
  },
  setItem: (name, value) => {
    if (localStorage) {
      try { localStorage.setItem(name, value); } catch { /* quota / private mode */ }
      return;
    }
    memoryStore.set(name, value);
  },
  removeItem: (name) => {
    if (localStorage) {
      try { localStorage.removeItem(name); } catch { /* ignore */ }
      return;
    }
    memoryStore.delete(name);
  },
};
