import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { collectionImage, collectionThumbnail, DIORAMA_BG } from '../data/spotAssets';
import { Spot } from '../data/spots';
import { useTheme } from '../theme';

const THUMBNAIL_MAX = 160;

interface Props {
  spot: Spot;
  size: number;
  locked?: boolean;
  live?: boolean; // subtle "living diorama" motion
  radius?: number;
}

export function Diorama({ spot, size, locked = false, live = false, radius }: Props) {
  const t = useTheme();
  const { art } = spot;
  const br = radius ?? size * 0.12;

  const [cloudX] = useState(() => new Animated.Value(0));
  const [bobY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!live) return;
    const cloud = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudX, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(cloudX, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bobY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    cloud.start();
    bob.start();
    return () => {
      cloud.stop();
      bob.stop();
    };
  }, [live, cloudX, bobY]);

  // Small cards (Passport grid, lists) use the 512px thumbnail when one exists.
  const image = size <= THUMBNAIL_MAX ? collectionThumbnail(spot.id) : collectionImage(spot.id);

  if (image) {
    return (
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: br,
            backgroundColor: locked ? t.locked : DIORAMA_BG,
          },
        ]}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: locked ? (t.mode === 'dark' ? 0.2 : 0.28) : 1,
            transform: [
              {
                translateY: live
                  ? bobY.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.012] })
                  : 0,
              },
            ],
          }}
        >
          <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </Animated.View>
        {locked && (
          <View style={[styles.lockBadgeWrap, { backgroundColor: t.lockOverlay }]}>
            <MaterialCommunityIcons name={'lock' as any} size={size * 0.14} color={t.lockedIcon} />
          </View>
        )}
      </View>
    );
  }

  const sky: [string, string] = locked ? ['#161F31', '#1C2537'] : art.sky;
  const ground = locked ? '#222E44' : art.ground;
  const groundDark = locked ? '#1A2436' : art.groundDark;
  const mainColor = locked ? '#3A4A63' : art.tint;
  const decoColor = locked ? '#32415A' : art.tint;
  const decoOpacity = locked ? 0.6 : 0.8;

  // platform geometry
  const w = size * 0.74;
  const h = w * 0.52;
  const cx = size / 2;
  const cy = size * 0.66;

  const diamond = (fill: string, dy: number, scale = 1) => (
    <View
      style={{
        position: 'absolute',
        left: cx - (w * scale) / 2,
        top: cy - (h * scale) / 2 + dy,
        width: w * scale,
        height: h * scale,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: fill,
          borderRadius: w * 0.16,
          transform: [{ rotate: '45deg' }, { scaleY: 0.55 }],
        }}
      />
    </View>
  );

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: br }]}>
      <LinearGradient colors={sky} style={StyleSheet.absoluteFill} />
      {/* sun glow */}
      {!locked && (
        <View
          style={{
            position: 'absolute',
            right: size * 0.12,
            top: size * 0.1,
            width: size * 0.14,
            height: size * 0.14,
            borderRadius: size * 0.07,
            backgroundColor: 'rgba(255,245,200,0.55)',
          }}
        />
      )}
      {/* cloud */}
      <Animated.View
        style={{
          position: 'absolute',
          left: size * 0.08,
          top: size * 0.08,
          opacity: locked ? 0.12 : 0.65,
          transform: [
            {
              translateX: live
                ? cloudX.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.14] })
                : 0,
            },
          ],
        }}
      >
        <MaterialCommunityIcons name={'cloud' as any} size={size * 0.12} color="#FFFFFF" />
      </Animated.View>
      {/* platform: base shadow, thickness, top */}
      {diamond('rgba(0,0,0,0.25)', h * 0.14, 1.04)}
      {diamond(groundDark, h * 0.07)}
      {diamond(ground, 0)}
      {/* deco icons around the platform */}
      {art.deco[0] && (
        <View
          style={{
            position: 'absolute',
            left: cx - w * 0.38,
            top: cy - size * 0.07,
            opacity: decoOpacity,
          }}
        >
          <MaterialCommunityIcons name={art.deco[0] as any} size={size * 0.12} color={decoColor} />
        </View>
      )}
      {art.deco[1] && (
        <View
          style={{
            position: 'absolute',
            left: cx + w * 0.2,
            top: cy - size * 0.09,
            opacity: decoOpacity,
          }}
        >
          <MaterialCommunityIcons name={art.deco[1] as any} size={size * 0.12} color={decoColor} />
        </View>
      )}
      {art.deco[2] && (
        <View
          style={{
            position: 'absolute',
            left: cx - size * 0.06,
            top: cy + size * 0.05,
            opacity: decoOpacity,
          }}
        >
          <MaterialCommunityIcons name={art.deco[2] as any} size={size * 0.11} color={decoColor} />
        </View>
      )}
      {/* main landmark icon with soft drop shadow */}
      <Animated.View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: cy - size * 0.4,
          opacity: locked ? 0.55 : 1,
          transform: [
            {
              translateY: live
                ? bobY.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.015] })
                : 0,
            },
          ],
          shadowColor: '#000',
          shadowOpacity: locked ? 0 : 0.3,
          shadowRadius: size * 0.02,
          shadowOffset: { width: 0, height: size * 0.015 },
        }}
      >
        <MaterialCommunityIcons name={art.icon as any} size={size * 0.3} color={mainColor} />
      </Animated.View>
      {locked && (
        <View style={styles.lockBadgeWrap}>
          <MaterialCommunityIcons name={'lock' as any} size={size * 0.14} color="#8E9AAF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  lockBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,22,0.25)',
  },
});
