import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { DEMO_TOOLS, loadDemoPassport } from '../../src/demo';
import { useStore } from '../../src/store';

// Demo shortcut: open islandia://dev/demo (or exp://<host>/--/dev/demo in Expo Go)
// to replace the passport with the demo trip (src/demo.ts). No-op in store builds.
export default function DemoScreen() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const home = () => router.replace('/');
    if (DEMO_TOOLS) void loadDemoPassport().finally(home);
    else home();
  }, [hydrated, router]);

  return null;
}
