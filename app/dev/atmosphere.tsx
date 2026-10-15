import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Season, SEASONS, Sky, skyMeta } from '../../src/atmosphere';
import { useStore } from '../../src/store';

// Dev shortcut: exp://<host>/--/dev/atmosphere?season=winter&night=1&sky=rain
// forces the preview atmosphere and returns home; ?reset=1 clears it.
// No-op in production builds.
export default function AtmosphereScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ season?: string; night?: string; sky?: string; reset?: string }>();
  const hydrated = useStore((s) => s.hydrated);
  const setOverride = useStore((s) => s.setAtmosphereOverride);

  useEffect(() => {
    if (!hydrated) return;
    if (__DEV__) {
      if (params.reset) {
        setOverride({});
      } else {
        setOverride({
          season: SEASONS.includes(params.season as Season) ? (params.season as Season) : undefined,
          night: params.night == null ? undefined : params.night === '1' || params.night === 'true',
          sky: params.sky && params.sky in skyMeta ? (params.sky as Sky) : undefined,
        });
      }
    }
    router.replace('/');
  }, [hydrated, params.season, params.night, params.sky, params.reset, setOverride, router]);

  return null;
}
