import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { collectionThumbnail } from '../data/spotAssets';
import { SPOTS, Spot } from '../data/spots';
import { useSealedSet } from '../entitlements';
import { checkinRadius, distanceMeters, formatDistance, LatLng } from '../geo';
import { activeCollections, CollectionEntry, useStore } from '../store';
import type { IslandiaWidgetProps } from './IslandiaWidget';
import type { SpotNearbyProps } from './SpotNearbyActivity';

// Feeds the iOS widget and the "you're here" Live Activity from app state.
// expo-widgets only exists in development / production builds on iOS, so in
// Expo Go and on Android everything here is a no-op.

type WidgetsModule = {
  widget: typeof import('./IslandiaWidget').default;
  activity: typeof import('./SpotNearbyActivity').default;
  directory: string;
};

const native: WidgetsModule | null = (() => {
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- loaded lazily so Expo Go never touches the native module */
    const directory: string | null = require('expo-widgets').widgetsDirectory;
    if (!directory) return null;
    return {
      widget: require('./IslandiaWidget').default,
      activity: require('./SpotNearbyActivity').default,
      directory,
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    return null;
  }
})();

const TIMELINE_DAYS = 7;

/** Coarse distance for the widget — it only refreshes when this text changes. */
function widgetDistance(m: number) {
  if (m < 1000) return '1 km 內';
  if (m < 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

async function sharedImage(directory: string, spotId: string): Promise<string> {
  const source = collectionThumbnail(spotId);
  if (typeof source !== 'number') return '';
  const art = Asset.fromModule(source);
  // The content hash is part of the name, so re-exported art replaces the cached copy.
  const target = new File(directory, `${spotId}-${(art.hash ?? '0').slice(0, 10)}.png`);
  if (!target.exists) {
    const asset = await art.downloadAsync();
    if (!asset.localUri) return '';
    new File(asset.localUri).copy(target);
  }
  return target.uri;
}

async function updateWidget(
  m: WidgetsModule,
  collections: Record<string, CollectionEntry>,
  sealed: Set<string>,
  next: { spot: Spot; dist: number } | null,
) {
  // Only opened models rotate through the widget; sealed ones stay hidden (spec §3.2).
  const featured = SPOTS.filter((s) => collections[s.id] && !sealed.has(s.id) && collectionThumbnail(s.id)).sort(
    (a, b) => collections[a.id].order - collections[b.id].order,
  );
  const base: Omit<IslandiaWidgetProps, 'spotId' | 'name' | 'nameEn' | 'city' | 'image'> = {
    collected: Object.keys(activeCollections(collections)).length,
    total: SPOTS.length,
    nextName: next?.spot.name ?? '',
    nextDistance: next ? widgetDistance(next.dist) : '',
  };

  // One featured diorama per local day, rotating through the collection.
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const day0 = Math.floor(midnight.getTime() / 86_400_000);
  const entries = [];
  for (let i = 0; i < TIMELINE_DAYS; i++) {
    const date = new Date(midnight.getTime() + i * 86_400_000);
    const spot = featured.length ? featured[(day0 + i) % featured.length] : null;
    const props: IslandiaWidgetProps = spot
      ? { ...base, spotId: spot.id, name: spot.name, nameEn: spot.nameEn, city: spot.city, image: await sharedImage(m.directory, spot.id) }
      : { ...base, spotId: '', name: '', nameEn: '', city: '', image: '' };
    // The first entry must be "now", or the widget keeps yesterday's content until midnight.
    entries.push({ date: i === 0 ? new Date() : date, props });
  }
  m.widget.updateTimeline(entries);
}

function syncActivity(m: WidgetsModule, here: Spot | null, dist: number) {
  const live = m.activity.getInstances();
  if (!here) {
    live.forEach((a) => void a.end('immediate'));
    return;
  }
  const props: SpotNearbyProps = { spotId: here.id, name: here.name, distance: formatDistance(dist) };
  if (live.length) void live[0].update(props);
  else m.activity.start(props, `islandia://spot/${here.id}`);
}

/** Mount once (home screen): keeps the widget timeline and Live Activity current. */
export function useWidgetSync(location: LatLng, hasFix: boolean) {
  const collections = useStore((s) => s.collections);
  const sealed = useSealedSet();

  const nearest = useMemo(() => {
    if (!hasFix) return null;
    let best: { spot: Spot; dist: number } | null = null;
    for (const spot of SPOTS) {
      if (collections[spot.id]) continue;
      const dist = distanceMeters(location, spot);
      if (!best || dist < best.dist) best = { spot, dist };
    }
    return best;
  }, [location, hasFix, collections]);

  const nextKey = nearest ? `${nearest.spot.id}|${widgetDistance(nearest.dist)}` : '';
  useEffect(() => {
    if (!native) return;
    updateWidget(native, collections, sealed, nearest).catch((e) => console.warn('[widget] update failed', e));
    // nearest is captured through nextKey so small GPS jitter doesn't reload the widget
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, sealed, nextKey]);

  const here = nearest && nearest.dist <= checkinRadius(nearest.spot) ? nearest : null;
  useEffect(() => {
    if (!native) return;
    try {
      syncActivity(native, here?.spot ?? null, here?.dist ?? 0);
    } catch (e) {
      console.warn('[widget] live activity failed', e);
    }
    // only restart/end when the spot changes, not on every metre of movement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here?.spot.id]);
}
