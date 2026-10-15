import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Season, seasonOf, Sky } from './atmosphere';
import { SPOTS } from './data/spots';
import { LatLng } from './geo';
import type { ThemeMode } from './theme';

export interface CollectionEntry {
  spotId: string;
  checkedInAt: string; // ISO date
  variant: 'day';
  firstVisit: boolean;
  order: number; // collection serial number (1-based)
  /** Atmosphere at the moment of collection. Entries from before 0.2 have none — use entrySeason(). */
  season?: Season;
  sky?: Sky;
  temperature?: number;
}

export interface Atmosphere {
  season: Season;
  sky?: Sky;
  temperature?: number;
}

/** Season a collection belongs to: recorded at check-in, or derived from the date for older entries. */
export const entrySeason = (e: CollectionEntry): Season =>
  e.season ?? seasonOf(new Date(e.checkedInAt));

/** Dev preview: force season / sky / night everywhere. Empty = automatic. Ignored in production. */
export interface AtmosphereOverride {
  season?: Season;
  sky?: Sky;
  night?: boolean;
}

interface IslandiaState {
  hydrated: boolean;
  onboarded: boolean;
  collections: Record<string, CollectionEntry>;
  devLocation: LatLng | null;
  themeMode: ThemeMode;
  atmosphereOverride: AtmosphereOverride;
  setAtmosphereOverride: (o: AtmosphereOverride) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setOnboarded: () => void;
  setDevLocation: (loc: LatLng | null) => void;
  checkIn: (spotId: string, atmosphere?: Atmosphere) => CollectionEntry;
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
      atmosphereOverride: {},
      setAtmosphereOverride: (o) => set({ atmosphereOverride: o }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setOnboarded: () => set({ onboarded: true }),
      setDevLocation: (loc) => set({ devLocation: loc }),
      checkIn: (spotId, atmosphere) => {
        const existing = get().collections[spotId];
        if (existing) return existing;
        const order = Object.keys(get().collections).length + 1;
        const entry: CollectionEntry = {
          spotId,
          checkedInAt: new Date().toISOString(),
          variant: 'day',
          firstVisit: true,
          order,
          season: atmosphere?.season ?? seasonOf(),
          sky: atmosphere?.sky,
          temperature: atmosphere?.temperature,
        };
        set({ collections: { ...get().collections, [spotId]: entry } });
        return entry;
      },
      unlockAll: () => {
        const collections = { ...get().collections };
        let order = Object.keys(collections).length;
        const now = new Date().toISOString();
        const season = seasonOf();
        for (const s of SPOTS) {
          if (collections[s.id]) continue;
          order += 1;
          collections[s.id] = { spotId: s.id, checkedInAt: now, variant: 'day', firstVisit: true, order, season };
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
        atmosphereOverride: s.atmosphereOverride,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);

// Development only: lets a debugger or automation drive the app, e.g.
// __islandia.getState().setAtmosphereOverride({ season: 'winter', night: true }).
if (__DEV__) (globalThis as any).__islandia = useStore;
