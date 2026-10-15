import { Animated } from 'react-native';

/**
 * One lightning strike every few seconds: a hard flash, a flicker, a second
 * weaker flash, then darkness. Drive an overlay's opacity with `v`.
 */
export function lightningLoop(v: Animated.Value) {
  const t = (toValue: number, duration: number) =>
    Animated.timing(v, { toValue, duration, useNativeDriver: true });
  return Animated.loop(
    Animated.sequence([Animated.delay(2400), t(0.9, 50), t(0.15, 90), t(0.7, 50), t(0, 320), Animated.delay(1100), t(0.5, 40), t(0, 260)]),
  );
}
