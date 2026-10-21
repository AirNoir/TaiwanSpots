import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { DEMO_TOOLS } from './demo';
import { LatLng } from './geo';
import { useStore } from './store';

// Taipei Main Station — fallback when no GPS available
const FALLBACK: LatLng = { latitude: 25.0478, longitude: 121.517 };

export function useLocation(): { location: LatLng; isDev: boolean; isFallback: boolean } {
  const devLocation = useStore((s) => s.devLocation);
  const [gps, setGps] = useState<LatLng | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) return;
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        (pos) => {
          if (mounted)
            setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      );
      // unmounted while the watch was starting: stop it now, cleanup already ran
      if (!mounted) watch.remove();
      else sub = watch;
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  if (DEMO_TOOLS && devLocation) return { location: devLocation, isDev: true, isFallback: false };
  if (gps) return { location: gps, isDev: false, isFallback: false };
  return { location: FALLBACK, isDev: false, isFallback: true };
}
