import * as Linking from 'expo-linking';
import { ActionSheetIOS, Platform } from 'react-native';
import { Spot } from './data/spots';

// Hands a spot to the phone's own navigation app; nothing is routed in-app.

export type TravelMode = 'walking' | 'driving';
export type MapApp = 'apple' | 'google';

/** Walk the last stretch, drive anything further. */
export const travelModeFor = (distanceM: number): TravelMode =>
  distanceM <= 1500 ? 'walking' : 'driving';

const dest = (s: Spot) => `${s.latitude.toFixed(6)},${s.longitude.toFixed(6)}`;

// Listed in app.json → ios.infoPlist.LSApplicationQueriesSchemes so canOpenURL may probe it.
const GOOGLE_IOS = 'comgooglemaps://';

export function directionsUrl(app: MapApp, spot: Spot, mode: TravelMode): string {
  const d = dest(spot);
  if (app === 'apple') return `maps://?daddr=${d}&dirflg=${mode === 'walking' ? 'w' : 'd'}`;
  if (Platform.OS === 'ios') return `${GOOGLE_IOS}?daddr=${d}&directionsmode=${mode}`;
  return `google.navigation:q=${d}&mode=${mode === 'walking' ? 'w' : 'd'}`;
}

/** Universal fallback: the Google Maps app when installed, otherwise the browser. */
export const webDirectionsUrl = (spot: Spot, mode: TravelMode) =>
  `https://www.google.com/maps/dir/?api=1&destination=${dest(spot)}&travelmode=${mode}`;

async function openFirst(urls: string[]) {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // not installed / no handler → try the next candidate
    }
  }
  return false;
}

/**
 * iOS: Apple Maps, or a sheet to pick Apple / Google when both are installed.
 * Android: Google Maps turn-by-turn, then any `geo:` handler, then the web.
 * Resolves false when the traveller cancelled or nothing could open.
 */
export async function openDirections(
  spot: Spot,
  mode: TravelMode,
  theme: 'light' | 'dark' = 'light',
): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const hasGoogle = await Linking.canOpenURL(GOOGLE_IOS).catch(() => false);
    let app: MapApp | null = 'apple';
    if (hasGoogle) {
      app = await new Promise<MapApp | null>((resolve) =>
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: `導航到 ${spot.name}`,
            options: ['取消', 'Apple 地圖', 'Google 地圖'],
            cancelButtonIndex: 0,
            userInterfaceStyle: theme,
          },
          (i) => resolve(i === 1 ? 'apple' : i === 2 ? 'google' : null),
        ),
      );
    }
    if (!app) return false;
    return openFirst([directionsUrl(app, spot, mode), webDirectionsUrl(spot, mode)]);
  }
  const d = dest(spot);
  return openFirst([
    directionsUrl('google', spot, mode),
    `geo:${d}?q=${d}(${encodeURIComponent(spot.name)})`,
    webDirectionsUrl(spot, mode),
  ]);
}
