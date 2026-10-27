import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collectionImage, DIORAMA_BG, silhouetteImage } from '../data/spotAssets';
import { Spot, SPOTS } from '../data/spots';
import { countyLabel, spotAltName, spotName, useLang, useT } from '../i18n';
import { useActiveCollections } from '../store';
import { makeStyles, Palette, useTheme } from '../theme';

interface Props {
  spot: Spot;
  visible: boolean;
  /** Lands past the free ten without the full version: the silhouette rises instead of the model. */
  sealed?: boolean;
  onDone: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export function UnlockOverlay({ spot, visible, sealed = false, onDone }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  // Progress as it will be once this spot is added (the check-in lands when the overlay closes).
  const collections = useActiveCollections();
  const already = !!collections[spot.id];
  const nth = Object.keys(collections).length + (already ? 0 : 1);
  const county = spot.city.split('・')[0];
  const sameCounty = SPOTS.filter((s) => s.region === spot.region && s.city.split('・')[0] === county);
  const countyGot = sameCounty.filter((s) => collections[s.id]).length + (already ? 0 : 1);
  const size = Math.min(SCREEN_W - 80, 300);
  const { art } = spot;
  const image = sealed ? silhouetteImage(spot.id) : collectionImage(spot.id);

  const [backdrop] = useState(() => new Animated.Value(0));
  const [platform] = useState(() => new Animated.Value(0));
  const [landmarkY] = useState(() => new Animated.Value(0));
  const [landmarkOpacity] = useState(() => new Animated.Value(0));
  const [decoScale] = useState(() => art.deco.map(() => new Animated.Value(0)));
  const [sparkle] = useState(() => new Animated.Value(0));
  const [textY] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!visible) return;
    backdrop.setValue(0);
    platform.setValue(0);
    landmarkY.setValue(0);
    landmarkOpacity.setValue(0);
    decoScale.forEach((v) => v.setValue(0));
    sparkle.setValue(0);
    textY.setValue(0);
    textOpacity.setValue(0);
    // Reset the action when replaying the externally triggered unlock animation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowButton(false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(backdrop, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(platform, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(landmarkY, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(landmarkOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.stagger(
        110,
        decoScale.map((v) =>
          Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true })
        )
      ),
      Animated.timing(sparkle, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowButton(true);
    });
  }, [visible, backdrop, platform, landmarkY, landmarkOpacity, decoScale, sparkle, textY, textOpacity]);

  if (!visible) return null;

  const w = size * 0.78;
  const h = w * 0.52;
  const cx = size / 2;
  const cy = size * 0.68;

  // Local calendar date (toISOString would give yesterday before 08:00 in Taiwan).
  const now = new Date();
  const dateStr = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((n, i) => (i ? String(n).padStart(2, '0') : String(n)))
    .join('.');

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

  const decoPos = [
    { left: cx - w * 0.36, top: cy - size * 0.06 },
    { left: cx + w * 0.2, top: cy - size * 0.08 },
    { left: cx - size * 0.05, top: cy + size * 0.06 },
  ];

  const sparklePos = [
    { left: cx - size * 0.34, top: cy - size * 0.42 },
    { left: cx + size * 0.26, top: cy - size * 0.34 },
    { left: cx + size * 0.05, top: cy - size * 0.52 },
  ];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDone}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: size, height: size * 1.05 }}>
            {image ? (
              /* pre-generated diorama rises into place */
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: size * 0.12,
                    overflow: 'hidden',
                    backgroundColor: sealed ? t.sealedBg : DIORAMA_BG,
                    opacity: landmarkOpacity,
                    transform: [
                      {
                        translateY: landmarkY.interpolate({
                          inputRange: [0, 1],
                          outputRange: [size * 0.2, 0],
                        }),
                      },
                      { scale: platform.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                    ],
                  },
                ]}
              >
                <Image
                  source={image}
                  style={{ width: '100%', height: '100%', tintColor: sealed ? t.sealedInk : undefined }}
                  resizeMode="contain"
                />
              </Animated.View>
            ) : (
              <>
            {/* sky card */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: size * 0.12,
                  overflow: 'hidden',
                  opacity: backdrop,
                },
              ]}
            >
              <LinearGradient colors={art.sky} style={StyleSheet.absoluteFill} />
            </Animated.View>
            {/* platform rises */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { transform: [{ scale: platform }] }]}
            >
              {diamond('rgba(0,0,0,0.25)', h * 0.14, 1.04)}
              {diamond(art.groundDark, h * 0.07)}
              {diamond(art.ground, 0)}
            </Animated.View>
            {/* landmark rises from the ground */}
            <Animated.View
              style={{
                position: 'absolute',
                alignSelf: 'center',
                top: cy - size * 0.42,
                opacity: landmarkOpacity,
                transform: [
                  {
                    translateY: landmarkY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [size * 0.22, 0],
                    }),
                  },
                ],
              }}
            >
              <MaterialCommunityIcons name={art.icon as any} size={size * 0.32} color={art.tint} />
            </Animated.View>
            {/* deco pops in */}
            {art.deco.map((d, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  ...decoPos[i % decoPos.length],
                  opacity: 0.85,
                  transform: [{ scale: decoScale[i] }],
                }}
              >
                <MaterialCommunityIcons name={d as any} size={size * 0.12} color={art.tint} />
              </Animated.View>
            ))}
              </>
            )}
            {/* sparkles */}
            {sparklePos.map((p, i) => (
              <Animated.View
                key={`sp-${i}`}
                style={{
                  position: 'absolute',
                  ...p,
                  opacity: sparkle,
                  transform: [
                    {
                      scale: sparkle.interpolate({
                        inputRange: [0, 0.6, 1],
                        outputRange: [0.3, 1.25, 1],
                      }),
                    },
                  ],
                }}
              >
                <MaterialCommunityIcons
                  name={'star-four-points' as any}
                  size={size * (0.09 + i * 0.02)}
                  color={t.accent}
                />
              </Animated.View>
            ))}
          </View>

          <Animated.View
            style={{
              alignItems: 'center',
              marginTop: 28,
              opacity: textOpacity,
              transform: [
                {
                  translateY: textY.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                },
              ],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MaterialCommunityIcons name={'star-four-points' as any} size={14} color={t.accent} />
              <Text style={styles.newLabel}>{tr('unlock.new')}</Text>
            </View>
            <Text style={styles.name}>{spotName(spot, lang)}</Text>
            <Text style={styles.nameZh}>{spotAltName(spot, lang)}</Text>
            <Text style={styles.date}>{dateStr}</Text>
            <Text style={styles.progress}>
              {tr('unlock.progress', { n: nth, county: countyLabel(county, lang), got: countyGot, total: sameCounty.length })}
              {countyGot === sameCounty.length ? tr('unlock.complete') : ''}
            </Text>
            {sealed && <Text style={styles.sealed}>{tr('unlock.sealed')}</Text>}
          </Animated.View>

          <View style={{ height: 76, justifyContent: 'center' }}>
            {showButton && (
              <Pressable style={styles.button} onPress={onDone}>
                <Text style={styles.buttonText}>{tr('unlock.add')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    // opaque: the page underneath shouldn't ghost through the moment
    backgroundColor: t.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: {
    color: t.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },
  name: {
    color: t.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  nameZh: {
    color: t.subtext,
    fontSize: 15,
    marginTop: 4,
  },
  date: {
    color: t.faint,
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 2,
  },
  sealed: {
    color: t.subtext,
    fontSize: 13,
    marginTop: 8,
  },
  progress: {
    color: t.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  button: {
    backgroundColor: t.accent,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 26,
  },
  buttonText: {
    color: t.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  }),
);
