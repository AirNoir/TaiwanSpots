import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { spotById, Spot } from '../data/spots';
import { useT } from '../i18n';
import { useStore } from '../store';
import { makeStyles, Palette, useTheme } from '../theme';
import { Diorama } from './Diorama';

// "All open" (docs/spec.md §3.2): after a purchase or restore, every model that was
// sealed flips from its silhouette to the real diorama, in collection order.
// Shown as its own full-screen route (app/unseal.tsx): an RN Modal can't present
// over the paywall's native modal on iOS.

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_SHOWN = 30;

export function UnsealOverlay({ onDone }: { onDone: () => void }) {
  const ids = useStore((s) => s.unsealing);
  const setUnsealing = useStore((s) => s.setUnsealing);
  // keep the list on screen while the route closes
  const [shown] = useState(() => ids ?? []);
  const done = () => {
    setUnsealing(null);
    onDone();
  };
  return <Unseal ids={shown} onDone={done} />;
}

function Unseal({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const spots = ids.map(spotById).filter((s): s is Spot => !!s);
  const shown = spots.slice(0, MAX_SHOWN);
  const cols = shown.length <= 4 ? 2 : shown.length <= 9 ? 3 : shown.length <= 16 ? 4 : 5;
  const gap = 8;
  const cell = Math.floor((Math.min(SCREEN_W, 440) - 48 - gap * (cols - 1)) / cols);

  const [flips] = useState(() => shown.map(() => new Animated.Value(0)));
  const [title] = useState(() => new Animated.Value(0));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const step = Math.min(140, 2000 / Math.max(1, flips.length));
    // start clean: in development effects run twice, and two runs fighting over the
    // same values leave cards stuck mid-turn
    title.setValue(0);
    flips.forEach((v) => v.setValue(0));
    const run = Animated.sequence([
      Animated.timing(title, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.stagger(
        step,
        flips.map((v) =>
          Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ),
      ),
    ]);
    run.start(({ finished }) => {
      if (!finished) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReady(true);
    });
    // a light tap as each one turns over
    const timers = flips.map((_, i) => setTimeout(() => Haptics.selectionAsync(), 400 + i * step + 210));
    return () => {
      run.stop();
      timers.forEach(clearTimeout);
    };
  }, [flips, title]);

  return (
      <View style={styles.backdrop}>
        <Animated.View style={{ alignItems: 'center', opacity: title }}>
          <Text style={styles.title}>{tr('unseal.title')}</Text>
          <Text style={styles.count}>{tr('unseal.count', { n: spots.length })}</Text>
        </Animated.View>
        <View style={[styles.grid, { gap, width: cols * cell + gap * (cols - 1) }]}>
          {shown.map((s, i) => {
            const v = flips[i];
            // first half narrows the silhouette away, second half widens the model back in.
            // A flat scaleX turn: 3D-rotated layers cut through their neighbours on iOS.
            const back = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
            const front = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
            return (
              <View key={s.id} style={{ width: cell, height: cell }}>
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleX: back }] }]}>
                  <Diorama spot={s} size={cell} radius={cell * 0.16} sealed />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleX: front }] }]}>
                  <Diorama spot={s} size={cell} radius={cell * 0.16} />
                </Animated.View>
              </View>
            );
          })}
        </View>
        {spots.length > MAX_SHOWN && <Text style={styles.more}>+{spots.length - MAX_SHOWN}</Text>}
        <View style={{ height: 80, justifyContent: 'center' }}>
          {ready && (
            <Pressable style={styles.button} onPress={onDone} accessibilityRole="button">
              <Text style={[styles.buttonText, { color: t.onAccent }]}>{tr('unseal.done')}</Text>
            </Pressable>
          )}
        </View>
      </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    title: { color: t.accent, fontSize: 15, fontWeight: '800', letterSpacing: 4 },
    count: { color: t.text, fontSize: 24, fontWeight: '800', marginTop: 8, marginBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    more: { color: t.subtext, fontSize: 15, fontWeight: '700', marginTop: 12 },
    button: { backgroundColor: t.accent, paddingHorizontal: 36, paddingVertical: 13, borderRadius: 26 },
    buttonText: { fontSize: 16, fontWeight: '700' },
  }),
);
