import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useStore } from '../../src/store';

// Dev shortcut: open islandia://dev/unlock-all (or exp://<host>/--/dev/unlock-all
// in Expo Go) to collect every spot and skip onboarding. No-op in production.
export default function UnlockAllScreen() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const unlockAll = useStore((s) => s.unlockAll);

  useEffect(() => {
    if (!hydrated) return;
    if (__DEV__) unlockAll();
    router.replace('/');
  }, [hydrated, unlockAll, router]);

  return null;
}
