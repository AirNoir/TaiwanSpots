import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SPOTS } from './data/spots';
import { LatLng } from './geo';
import type { ThemeMode } from './theme';

export interface CollectionEntry {
  spotId: string;
  checkedInAt: string; // ISO date
  variant: 'day';
  firstVisit: boolean;
  order: number; // collection serial number (1-based)
}

interface IslandiaState {
  hydrated: boolean;
  onboarded: boolean;
  collections: Record<string, CollectionEntry>;
  devLocation: LatLng | null;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  setOnboarded: () => void;
  setDevLocation: (loc: LatLng | null) => void;
  checkIn: (spotId: string) => CollectionEntry;
  /** Dev: collect every active spot (keeps existing entries). */
  unlockAll: () => void;
  reset: () => void;
}

export const useStore = create<IslandiaState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      collections: {},
      devLocation: null,
      themeMode: 'light',
      setThemeMode: (mode) => set({ themeMode: mode }),
      setOnboarded: () => set({ onboarded: true }),
      setDevLocation: (loc) => set({ devLocation: loc }),
      checkIn: (spotId) => {
        const existing = get().collections[spotId];
        if (existing) return existing;
        const order = Object.keys(get().collections).length + 1;
        const entry: CollectionEntry = {
          spotId,
          checkedInAt: new Date().toISOString(),
          variant: 'day',
          firstVisit: true,
          order,
        };
        set({ collections: { ...get().collections, [spotId]: entry } });
        return entry;
      },
      unlockAll: () => {
        const collections = { ...get().collections };
        let order = Object.keys(collections).length;
        const now = new Date().toISOString();
        for (const s of SPOTS) {
          if (collections[s.id]) continue;
          order += 1;
          collections[s.id] = { spotId: s.id, checkedInAt: now, variant: 'day', firstVisit: true, order };
        }
        set({ collections, onboarded: true });
      },
      reset: () => set({ collections: {}, onboarded: false, devLocation: null }),
    }),
    {
      name: 'islandia-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        collections: s.collections,
        devLocation: s.devLocation,
        themeMode: s.themeMode,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);
