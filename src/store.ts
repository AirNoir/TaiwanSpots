import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Season, seasonOf, Sky } from './atmosphere';
import { SPOTS } from './data/spots';
import { LatLng } from './geo';
import type { LangPref } from './i18n';
import type { ThemeMode } from './theme';

/** A photo kept with a collected spot (src/photos.ts). `file` is relative to the document directory. */
export interface SpotPhoto {
  id: string;
  file: string; // photos/<spotId>/<id>.jpg
  width: number;
  height: number;
  takenAt?: string; // ISO date, when known
  addedAt: string; // ISO date
}

/** Photos per spot (docs/spec.md §10). */
export const PHOTO_LIMIT = 3;

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
  /** Up to PHOTO_LIMIT photos on this phone only; never sent to the cloud (src/sync.ts keeps them through merges). */
  photos?: SpotPhoto[];
}

export interface Atmosphere {
  season: Season;
  sky?: Sky;
  temperature?: number;
}

const ACTIVE_IDS = new Set(SPOTS.map((s) => s.id));

/**
 * Collections of spots that are in the game right now. Entries for retired
 * (active: false) spots stay in storage so they come back if the spot does,
 * but they never count toward totals, progress or achievements.
 */
export function activeCollections(c: Record<string, CollectionEntry>): Record<string, CollectionEntry> {
  const out: Record<string, CollectionEntry> = {};
  for (const id in c) if (ACTIVE_IDS.has(id)) out[id] = c[id];
  return out;
}

export function useActiveCollections() {
  const c = useStore((s) => s.collections);
  return useMemo(() => activeCollections(c), [c]);
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

/** Who the cloud copy belongs to (docs/spec.md §5). Null until the first sign-in succeeds. */
export interface Account {
  id: string;
  /** A guest account made at first launch: it backs up nothing a new phone could get back. */
  anonymous: boolean;
  provider: 'anonymous' | 'apple' | 'google';
  email: string | null;
}

interface IslandiaState {
  hydrated: boolean;
  onboarded: boolean;
  collections: Record<string, CollectionEntry>;
  /** Replaces the passport with the merged local + cloud copy (src/sync.ts). */
  setCollections: (collections: Record<string, CollectionEntry>) => void;
  /** Current Supabase user; not persisted, the auth client restores its own session. */
  account: Account | null;
  setAccount: (account: Account | null) => void;
  /** Last successful cloud sync (ISO), shown on the Me tab. */
  lastSyncAt: string | null;
  setLastSyncAt: (at: string | null) => void;
  devLocation: LatLng | null;
  themeMode: ThemeMode;
  /** UI language: 'auto' follows the phone (see src/i18n.ts). */
  language: LangPref;
  setLanguage: (l: LangPref) => void;
  atmosphereOverride: AtmosphereOverride;
  setAtmosphereOverride: (o: AtmosphereOverride) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setOnboarded: () => void;
  setDevLocation: (loc: LatLng | null) => void;
  /** Active RevenueCat entitlements ('full', 'outer_islands'); kept from the last check while offline. */
  entitlements: string[];
  setEntitlements: (e: string[]) => void;
  /** Demo builds: pretend the full version is (true) or isn't (false) bought. Null = the real purchase. */
  simulatedFull: boolean | null;
  setSimulatedFull: (v: boolean | null) => void;
  /** The paywall has been shown at the first sealed collection (it only shows there once). */
  paywallSeen: boolean;
  setPaywallSeen: () => void;
  /** Spots being unsealed right now by the "all open" moment after a purchase. Not persisted. */
  unsealing: string[] | null;
  setUnsealing: (ids: string[] | null) => void;
  checkIn: (spotId: string, atmosphere?: Atmosphere) => CollectionEntry;
  /** Attaches a stored photo to a collected spot; false when the spot is not collected or already has PHOTO_LIMIT. */
  addPhoto: (spotId: string, photo: SpotPhoto) => boolean;
  removePhoto: (spotId: string, photoId: string) => void;
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
      setCollections: (collections) => set({ collections }),
      account: null,
      setAccount: (account) => set({ account }),
      lastSyncAt: null,
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      devLocation: null,
      themeMode: 'light',
      language: 'auto',
      setLanguage: (language) => set({ language }),
      atmosphereOverride: {},
      setAtmosphereOverride: (o) => set({ atmosphereOverride: o }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setOnboarded: () => set({ onboarded: true }),
      setDevLocation: (loc) => set({ devLocation: loc }),
      entitlements: [],
      setEntitlements: (entitlements) => set({ entitlements }),
      simulatedFull: null,
      setSimulatedFull: (simulatedFull) => set({ simulatedFull }),
      paywallSeen: false,
      setPaywallSeen: () => set({ paywallSeen: true }),
      unsealing: null,
      setUnsealing: (unsealing) => set({ unsealing }),
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
      addPhoto: (spotId, photo) => {
        const e = get().collections[spotId];
        if (!e) return false;
        const photos = e.photos ?? [];
        if (photos.length >= PHOTO_LIMIT) return false;
        set({ collections: { ...get().collections, [spotId]: { ...e, photos: [...photos, photo] } } });
        return true;
      },
      removePhoto: (spotId, photoId) => {
        const e = get().collections[spotId];
        if (!e?.photos) return;
        const photos = e.photos.filter((p) => p.id !== photoId);
        set({ collections: { ...get().collections, [spotId]: { ...e, photos: photos.length ? photos : undefined } } });
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
      reset: () => set({ collections: {}, onboarded: false, devLocation: null, paywallSeen: false, lastSyncAt: null }),
    }),
    {
      name: 'islandia-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        collections: s.collections,
        devLocation: s.devLocation,
        themeMode: s.themeMode,
        language: s.language,
        atmosphereOverride: s.atmosphereOverride,
        entitlements: s.entitlements,
        simulatedFull: s.simulatedFull,
        paywallSeen: s.paywallSeen,
        lastSyncAt: s.lastSyncAt,
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
