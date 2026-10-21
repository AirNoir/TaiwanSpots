import { useEffect, useRef } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Dev automation: registers a ScrollView as `globalThis.__islandiaScroll[name](y)`
 * so screenshots can be taken further down a screen from the Metro inspector.
 * Does nothing in production.
 */
export function useDevScroll(name: string) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    if (!__DEV__) return;
    const g = globalThis as any;
    g.__islandiaScroll = g.__islandiaScroll ?? {};
    const scroll = (y: number) => ref.current?.scrollTo({ y, animated: false });
    g.__islandiaScroll[name] = scroll;
    return () => {
      // a remount may already have registered its own scroller
      if (g.__islandiaScroll[name] === scroll) delete g.__islandiaScroll[name];
    };
  }, [name]);
  return ref;
}
