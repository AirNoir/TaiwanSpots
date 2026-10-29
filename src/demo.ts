import { seasonOf, Sky } from './atmosphere';
import { signOut } from './auth';
import { CollectionEntry, useStore } from './store';
import { syncNow } from './sync';

/**
 * Demo helpers (teleport to a spot, preset locations, reset collection, demo passport).
 * On in development; a TestFlight / internal build turns them on with
 * EXPO_PUBLIC_DEMO_TOOLS=1. Off in store builds, where they would let anyone
 * collect a spot without going there.
 */
export const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === '1';

/**
 * A believable year of travel for screenshots: spot, local time of the check-in, sky, °C.
 * Every region, every season, every access level, a few multi-spot days.
 */
const DEMO_TRIP: [string, string, Sky, number][] = [
  ['taipei-101', '2025-09-13T10:40:00+08:00', 'clear', 31],
  ['xiangshan', '2025-09-13T17:20:00+08:00', 'clear', 30],
  ['tamsui', '2025-09-20T16:10:00+08:00', 'cloudy', 29],
  ['jiufen', '2025-10-04T15:30:00+08:00', 'fog', 24],
  ['houtong', '2025-10-04T11:05:00+08:00', 'cloudy', 25],
  ['yehliu', '2025-10-05T10:15:00+08:00', 'clear', 27],
  ['sun-moon-lake', '2025-10-25T09:50:00+08:00', 'clear', 24],
  ['cingjing', '2025-10-26T08:30:00+08:00', 'clear', 16],
  ['gaomei', '2025-11-15T17:05:00+08:00', 'clear', 23],
  ['rainbow-village', '2025-11-16T10:20:00+08:00', 'cloudy', 24],
  ['lukang', '2025-11-16T14:40:00+08:00', 'clear', 25],
  ['anping', '2025-12-06T11:10:00+08:00', 'clear', 22],
  ['chihkan', '2025-12-06T15:25:00+08:00', 'clear', 23],
  ['pier2', '2025-12-07T10:45:00+08:00', 'cloudy', 22],
  ['cijin', '2025-12-07T16:30:00+08:00', 'clear', 23],
  ['hehuanshan', '2026-01-17T07:20:00+08:00', 'snow', 2],
  ['aowanda', '2026-01-18T11:00:00+08:00', 'clear', 9],
  ['pingxi', '2026-02-14T18:40:00+08:00', 'drizzle', 14],
  ['shifen-waterfall', '2026-02-15T10:30:00+08:00', 'rain', 13],
  ['alishan', '2026-03-07T05:50:00+08:00', 'fog', 10],
  ['fenqihu', '2026-03-08T12:15:00+08:00', 'cloudy', 14],
  ['wuling-farm', '2026-03-21T10:05:00+08:00', 'clear', 12],
  ['taroko', '2026-04-11T09:40:00+08:00', 'clear', 24],
  ['qingshui-cliff', '2026-04-11T13:20:00+08:00', 'clear', 25],
  ['qixingtan', '2026-04-12T07:10:00+08:00', 'cloudy', 23],
  ['brown-avenue', '2026-05-02T09:30:00+08:00', 'clear', 27],
  ['sanxiantai', '2026-05-02T15:50:00+08:00', 'clear', 26],
  ['guishan-island', '2026-05-23T10:10:00+08:00', 'clear', 26],
  ['kenting', '2026-06-13T15:00:00+08:00', 'clear', 32],
  ['longpan', '2026-06-13T17:30:00+08:00', 'clear', 31],
  ['xiaoliuqiu', '2026-06-14T11:20:00+08:00', 'clear', 31],
  ['shitiping', '2026-07-04T13:45:00+08:00', 'clear', 32],
  ['liushidan', '2026-08-15T10:30:00+08:00', 'clear', 28],
  ['taipingshan', '2026-08-08T10:25:00+08:00', 'fog', 18],
  ['qingtiangang', '2026-08-22T08:15:00+08:00', 'cloudy', 26],
  ['palace-museum', '2026-09-19T14:30:00+08:00', 'rain', 27],
  ['yushan', '2026-10-10T06:30:00+08:00', 'clear', 5],
  ['dadaocheng', '2026-10-24T16:50:00+08:00', 'clear', 25],
];

export const DEMO_TRIP_SIZE = DEMO_TRIP.length;

/**
 * Replaces the passport on this phone with the demo trip. Signs out first so the demo
 * lands in a fresh guest account and nobody's real backup is touched; signing in
 * afterwards merges the demo into that account (a shared demo login for screenshots).
 */
export async function loadDemoPassport(): Promise<number> {
  await signOut();
  const collections: Record<string, CollectionEntry> = {};
  [...DEMO_TRIP]
    .sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]))
    .forEach(([spotId, at, sky, temperature], i) => {
      const date = new Date(at);
      collections[spotId] = {
        spotId,
        checkedInAt: date.toISOString(),
        variant: 'day',
        firstVisit: true,
        order: i + 1,
        season: seasonOf(date),
        sky,
        temperature,
      };
    });
  useStore.setState({ collections, onboarded: true, simulatedFull: true, paywallSeen: true });
  void syncNow();
  return DEMO_TRIP.length;
}

// Development only: __islandiaDemo() from the Metro inspector.
if (__DEV__) (globalThis as any).__islandiaDemo = loadDemoPassport;
