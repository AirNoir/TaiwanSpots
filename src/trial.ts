import { seasonOf } from './atmosphere';
import { LatLng } from './geo';
import { deletePhotoFiles } from './photos';
import { CollectionEntry, useStore } from './store';
import { syncNow } from './sync';

/**
 * Try mode (docs/app-review.md): anyone, App Review included, can play through a check-in
 * without being in Taiwan. It is a visible feature on the Me tab, not a hidden switch.
 *
 * - The real passport is put aside in `trial.saved` and comes back untouched at the end.
 * - A sample passport starts with four models, so the first check-in opens the fifth free
 *   model and the next one lands sealed with the paywall (the real purchase, sandbox in review).
 * - A sample place stands in for GPS; each is inside the check-in radius of 2+ spots
 *   (worked out from src/data/spots.ts, 2026-11-02), except Hualien, which has one.
 * - Cloud sync, the home-screen widget and the Live Activity pause while trying.
 */

export interface TrialPlace {
  id: string;
  zh: string;
  en: string;
  coord: LatLng;
}

export const TRIAL_PLACES: TrialPlace[] = [
  { id: 'xinyi', zh: '台北信義', en: 'Taipei Xinyi', coord: { latitude: 25.0304, longitude: 121.5694 } }, // Taipei 101, Xiangshan
  { id: 'wanhua', zh: '台北西門', en: 'Taipei Ximen', coord: { latitude: 25.0404, longitude: 121.5035 } }, // Ximending, Longshan Temple
  { id: 'taichung', zh: '台中', en: 'Taichung', coord: { latitude: 24.1701, longitude: 120.6436 } }, // Opera House, Fengjia
  { id: 'tainan', zh: '台南', en: 'Tainan', coord: { latitude: 22.9975, longitude: 120.2025 } }, // Chihkan, Confucius Temple, Shennong St, Hayashi
  { id: 'kaohsiung', zh: '高雄', en: 'Kaohsiung', coord: { latitude: 22.6161, longitude: 120.2748 } }, // Pier-2, Cijin, British Consulate
  { id: 'hualien', zh: '花蓮', en: 'Hualien', coord: { latitude: 23.9769, longitude: 121.6044 } }, // Dongdamen
];

/** The sample passport's first four models: well-known, with art, none near a sample place. */
const STARTERS = ['jiufen', 'sun-moon-lake', 'alishan', 'kenting'];

function sampleCollections(): Record<string, CollectionEntry> {
  const out: Record<string, CollectionEntry> = {};
  const now = Date.now();
  STARTERS.forEach((spotId, i) => {
    const date = new Date(now - (STARTERS.length - i) * 7 * 24 * 3600 * 1000);
    out[spotId] = {
      spotId,
      checkedInAt: date.toISOString(),
      variant: 'day',
      firstVisit: true,
      order: i + 1,
      season: seasonOf(date),
      sky: 'clear',
      temperature: 24,
    };
  });
  return out;
}

export function startTrial(): void {
  const s = useStore.getState();
  if (s.trial) return;
  useStore.setState({
    trial: {
      saved: s.collections,
      savedPaywallSeen: s.paywallSeen,
      savedSimulatedFull: s.simulatedFull,
      startedAt: new Date().toISOString(),
    },
    collections: sampleCollections(),
    paywallSeen: false,
    simulatedFull: null,
    trialLocation: TRIAL_PLACES[0].coord,
  });
}

export function endTrial(): void {
  const s = useStore.getState();
  if (!s.trial) return;
  // Photos added while trying belong to the sample passport only. Sample entries start without
  // photos, so any photo array that isn't the saved entry's own was added during the trial.
  for (const e of Object.values(s.collections)) {
    if (s.trial.saved[e.spotId]?.photos === e.photos) continue;
    e.photos?.forEach(deletePhotoFiles);
  }
  useStore.setState({
    collections: s.trial.saved,
    paywallSeen: s.trial.savedPaywallSeen,
    simulatedFull: s.trial.savedSimulatedFull ?? null,
    trial: null,
    trialLocation: null,
  });
  void syncNow();
}

export const useTrying = () => useStore((s) => s.trial !== null);

// Development only: __islandiaTrial.start() / .end() from the Metro inspector.
if (__DEV__) (globalThis as any).__islandiaTrial = { start: startTrial, end: endTrial };
