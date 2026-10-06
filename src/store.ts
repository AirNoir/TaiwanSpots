import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LatLng } from './geo';

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
  setOnboarded: () => void;
  setDevLocation: (loc: LatLng | null) => void;
  checkIn: (spotId: string) => CollectionEntry;
  reset: () => void;
}

export const useStore = create<IslandiaState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      collections: {},
      devLocation: null,
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
      reset: () => set({ collections: {}, onboarded: false, devLocation: null }),
    }),
    {
      name: 'islandia-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        collections: s.collections,
        devLocation: s.devLocation,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);
