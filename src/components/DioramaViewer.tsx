import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { collectionImage } from '../data/spotAssets';
import { Spot } from '../data/spots';
import { makeStyles, Palette } from '../theme';

// Full-screen diorama viewer: pinch to zoom, drag to pan, double-tap to zoom
// in / reset, swipe down (when not zoomed) to close. Mount it only while open
// so every opening starts un-zoomed.

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;
const SPRING = { damping: 20, stiffness: 180 };

interface Props {
  spot: Spot;
  onClose: () => void;
}

export function DioramaViewer({ spot, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const side = Math.min(W, H); // dioramas are square, shown "contain"

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const dismissY = useSharedValue(0);

  // Keep the zoomed image covering the screen — no panning into empty space.
  const clampX = (x: number, s: number) => {
    'worklet';
    const max = Math.max(0, (side * s - W) / 2);
    return Math.min(max, Math.max(-max, x));
  };
  const clampY = (y: number, s: number) => {
    'worklet';
    const max = Math.max(0, (side * s - H) / 2);
    return Math.min(max, Math.max(-max, y));
  };
  const settle = () => {
    'worklet';
    const s = Math.min(MAX_SCALE, Math.max(1, scale.value));
    scale.value = withSpring(s, SPRING);
    tx.value = withSpring(s === 1 ? 0 : clampX(tx.value, s), SPRING);
    ty.value = withSpring(s === 1 ? 0 : clampY(ty.value, s), SPRING);
    savedScale.value = s;
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE * 1.3, Math.max(0.8, savedScale.value * e.scale));
      // Zoom around the fingers: the content point under the focal stays put.
      const fx = e.focalX - W / 2;
      const fy = e.focalY - H / 2;
      const k = next / savedScale.value;
      scale.value = next;
      tx.value = fx - (fx - savedTx.value) * k;
      ty.value = fy - (fy - savedTy.value) * k;
    })
    .onEnd(settle);

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.01) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else if (e.numberOfPointers === 1) {
        dismissY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.01) {
        tx.value = withSpring(clampX(savedTx.value + e.translationX + e.velocityX * 0.05, scale.value), SPRING);
        ty.value = withSpring(clampY(savedTy.value + e.translationY + e.velocityY * 0.05, scale.value), SPRING);
      } else if (dismissY.value > DISMISS_DISTANCE || e.velocityY > 1200) {
        dismissY.value = withTiming(H, { duration: 180 });
        scheduleOnRN(onClose);
      } else {
        dismissY.value = withSpring(0, SPRING);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1.01) {
        scale.value = withSpring(1, SPRING);
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        savedScale.value = 1;
      } else {
        const s = DOUBLE_TAP_SCALE;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        scale.value = withSpring(s, SPRING);
        tx.value = withSpring(clampX(-fx * (s - 1), s), SPRING);
        ty.value = withSpring(clampY(-fy * (s - 1), s), SPRING);
        savedScale.value = s;
      }
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + dismissY.value },
      { scale: scale.value * interpolate(dismissY.value, [0, H], [1, 0.75]) },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dismissY.value, [0, H * 0.6], [1, 0]),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(scale.value, [1, 1.4], [1, 0], 'clamp') *
      interpolate(dismissY.value, [0, 80], [1, 0], 'clamp'),
  }));

  const source = collectionImage(spot.id);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Modals render outside the app root, so they need their own gesture root. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.stage, imageStyle]}>
              {source && <Image source={source} style={{ width: side, height: side }} resizeMode="contain" />}
            </Animated.View>
          </View>
        </GestureDetector>

        <Animated.View
          style={[styles.header, { paddingTop: insets.top + 8 }, chromeStyle]}
          pointerEvents="none"
        >
          <Text style={styles.title}>{spot.name}</Text>
          <Text style={styles.subtitle}>{spot.nameEn}</Text>
        </Animated.View>
        <Pressable
          style={[styles.close, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="關閉"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        <Animated.Text
          style={[styles.hint, { bottom: insets.bottom + 24 }, chromeStyle]}
          pointerEvents="none"
        >
          雙指縮放・點兩下放大・往下滑關閉
        </Animated.Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

// The viewer is always dark (like a photo lightbox) so details read in either theme.
const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    root: { flex: 1 },
    backdrop: { backgroundColor: t.scrim },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { position: 'absolute', left: 20, right: 64, top: 0 },
    title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 2, marginTop: 2 },
    close: {
      position: 'absolute',
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    hint: {
      position: 'absolute',
      alignSelf: 'center',
      color: 'rgba(255,255,255,0.6)',
      fontSize: 12,
      letterSpacing: 1,
    },
  }),
);
