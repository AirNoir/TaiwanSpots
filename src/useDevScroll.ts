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
    g.__islandiaScroll[name] = (y: number) => ref.current?.scrollTo({ y, animated: false });
    return () => {
      delete g.__islandiaScroll[name];
    };
  }, [name]);
  return ref;
}
