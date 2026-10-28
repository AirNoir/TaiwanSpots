import { AppState } from 'react-native';
import type { Season, Sky } from './atmosphere';
import { CollectionEntry, useStore } from './store';
import { supabase } from './supabase';

// Passport backup (docs/spec.md §5.2). The phone keeps the real passport; the
// cloud holds one row per collected spot for the signed-in user. A sync pulls
// the user's rows, merges them in (the earliest check-in of a spot wins, and
// the collection order follows the merged dates), then pushes what the cloud
// is missing. It runs at launch, after every sign-in, after a check-in and when
// the app comes back to the foreground after a while.

export interface CollectionRow {
  user_id: string;
  spot_id: string;
  checked_in_at: string;
  season: string | null;
  sky: string | null;
  temperature: number | null;
  variant: string;
}

const ROW_COLUMNS = 'spot_id, checked_in_at, season, sky, temperature, variant';
const FOREGROUND_SYNC_AFTER_MS = 5 * 60 * 1000;

export function toRow(userId: string, e: CollectionEntry): CollectionRow {
  return {
    user_id: userId,
    spot_id: e.spotId,
    checked_in_at: e.checkedInAt,
    season: e.season ?? null,
    sky: e.sky ?? null,
    temperature: e.temperature ?? null,
    variant: e.variant,
  };
}

function fromRow(r: CollectionRow, order: number): CollectionEntry {
  return {
    spotId: r.spot_id,
    checkedInAt: r.checked_in_at,
    variant: 'day',
    firstVisit: true,
    order,
    season: (r.season as Season | null) ?? undefined,
    sky: (r.sky as Sky | null) ?? undefined,
    temperature: r.temperature ?? undefined,
  };
}

/** Local and cloud passports as one: earliest check-in per spot, order by date. */
export function mergeCollections(
  local: Record<string, CollectionEntry>,
  cloud: CollectionRow[],
): Record<string, CollectionEntry> {
  const merged: Record<string, CollectionEntry> = { ...local };
  for (const r of cloud) {
    const mine = merged[r.spot_id];
    if (!mine || Date.parse(r.checked_in_at) < Date.parse(mine.checkedInAt)) {
      // a cloud-only spot joins at the end for now; the sort below places it by date
      merged[r.spot_id] = fromRow(r, mine?.order ?? Number.MAX_SAFE_INTEGER);
    }
  }
  const sorted = Object.values(merged).sort(
    (a, b) =>
      Date.parse(a.checkedInAt) - Date.parse(b.checkedInAt) || a.order - b.order || a.spotId.localeCompare(b.spotId),
  );
  const out: Record<string, CollectionEntry> = {};
  sorted.forEach((e, i) => {
    out[e.spotId] = e.order === i + 1 ? e : { ...e, order: i + 1 };
  });
  return out;
}

function same(a: Record<string, CollectionEntry>, b: Record<string, CollectionEntry>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => b[k] && b[k].checkedInAt === a[k].checkedInAt && b[k].order === a[k].order);
}

function whenHydrated(): Promise<void> {
  return new Promise((resolve) => {
    if (useStore.getState().hydrated) return resolve();
    const stop = useStore.subscribe((s) => {
      if (s.hydrated) {
        stop();
        resolve();
      }
    });
  });
}

let applyingRemote = false;
let inFlight: Promise<boolean> | null = null;

/** Pull, merge, push. Concurrent calls share one run. Resolves false when offline or signed out. */
export function syncNow(): Promise<boolean> {
  if (!supabase) return Promise.resolve(false);
  if (!inFlight) {
    inFlight = run().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function run(): Promise<boolean> {
  if (!supabase) return false;
  // the persisted passport must be loaded first, or the cloud would merge into an empty one
  await whenHydrated();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return false;

  const { data, error } = await supabase.from('collections').select(ROW_COLUMNS).eq('user_id', user.id);
  if (error) {
    console.warn('[sync] pull failed', error.message);
    return false;
  }
  const cloud = (data ?? []) as unknown as Omit<CollectionRow, 'user_id'>[];
  const cloudRows = cloud.map((r) => ({ ...r, user_id: user.id }));

  const store = useStore.getState();
  const merged = mergeCollections(store.collections, cloudRows);
  if (!same(merged, store.collections)) {
    applyingRemote = true;
    try {
      store.setCollections(merged);
    } finally {
      applyingRemote = false;
    }
  }

  // only what the cloud lacks or has a later date for
  const cloudAt = new Map(cloudRows.map((r) => [r.spot_id, Date.parse(r.checked_in_at)]));
  const missing = Object.values(merged)
    .filter((e) => {
      const at = cloudAt.get(e.spotId);
      return at == null || Date.parse(e.checkedInAt) < at;
    })
    .map((e) => toRow(user.id, e));
  if (missing.length > 0) {
    const { error: pushError } = await supabase.from('collections').upsert(missing, { onConflict: 'user_id,spot_id' });
    if (pushError) {
      console.warn('[sync] push failed', pushError.message);
      return false;
    }
  }
  useStore.getState().setLastSyncAt(new Date().toISOString());
  return true;
}

/** Demo reset: clear the cloud copy too, or the next sync would bring the passport back. */
export async function resetEverywhere(): Promise<void> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      const { error } = await supabase.from('collections').delete().eq('user_id', user.id);
      if (error) console.warn('[sync] clear failed', error.message);
    }
  }
  useStore.getState().reset();
}

let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Call once at launch: syncs after local changes and on returning to the foreground. */
export function startSync() {
  if (!supabase || started) return;
  started = true;
  useStore.subscribe((s, prev) => {
    if (s.collections === prev.collections || applyingRemote) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void syncNow(), 1500);
  });
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    const last = useStore.getState().lastSyncAt;
    if (!last || Date.now() - Date.parse(last) > FOREGROUND_SYNC_AFTER_MS) void syncNow();
  });
}
