import { useMemo } from 'react';
import { DEMO_TOOLS } from './demo';
import { purchasesAvailable } from './purchases';
import { activeCollections, CollectionEntry, useStore } from './store';

// Free tier and sealing (docs/spec.md §3). Sealing is never stored: it is worked
// out from the collection order and the entitlements every time, so a purchase,
// a restore or a refund changes it everywhere at once.

/** Models that open without the full version: the first ten collected. */
export const FREE_LIMIT = 10;

export const ENTITLEMENT_FULL = 'full';

type EntitlementState = { entitlements: string[]; simulatedFull: boolean | null };

export function hasFull(s: EntitlementState): boolean {
  if (DEMO_TOOLS && s.simulatedFull != null) return s.simulatedFull;
  // A store build without a RevenueCat key has nothing to sell: never seal there.
  // (Demo builds and Expo Go keep sealing so the free tier can be tried out.)
  if (!purchasesAvailable && !DEMO_TOOLS) return true;
  return s.entitlements.includes(ENTITLEMENT_FULL);
}

/** Collected spots past the free ten, in collection order. Retired spots don't take a place. */
export function sealedList(collections: Record<string, CollectionEntry>, full: boolean): string[] {
  if (full) return [];
  return Object.values(activeCollections(collections))
    .sort((a, b) => a.order - b.order)
    .slice(FREE_LIMIT)
    .map((e) => e.spotId);
}

export function useHasFull(): boolean {
  return useStore(hasFull);
}

/** Set of sealed spot ids; a spot that isn't collected is never sealed (it is locked). */
export function useSealedSet(): Set<string> {
  const collections = useStore((s) => s.collections);
  const full = useHasFull();
  return useMemo(() => new Set(sealedList(collections, full)), [collections, full]);
}

/** Whether the next collection will land sealed (the 11th onwards without the full version). */
export function nextIsSealed(collections: Record<string, CollectionEntry>, full: boolean): boolean {
  return !full && Object.keys(activeCollections(collections)).length >= FREE_LIMIT;
}

/**
 * Runs a purchase or restore; if it leaves the full version owned, the models that were
 * sealed are queued for the "all open" moment. Returns whether the caller should open
 * the /unseal screen.
 */
export async function withUnseal<R>(run: () => Promise<R>): Promise<[R, boolean]> {
  const before = useStore.getState();
  const sealed = sealedList(before.collections, hasFull(before));
  const result = await run();
  const after = useStore.getState();
  const unseal = sealed.length > 0 && hasFull(after);
  if (unseal) after.setUnsealing(sealed);
  return [result, unseal];
}
