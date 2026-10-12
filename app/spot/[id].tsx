import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diorama } from '../../src/components/Diorama';
import { DioramaViewer } from '../../src/components/DioramaViewer';
import { ShareCardModal } from '../../src/components/ShareCardModal';
import { UnlockOverlay } from '../../src/components/UnlockOverlay';
import { spotById, SPOTS } from '../../src/data/spots';
import { distanceMeters, formatDistance } from '../../src/geo';
import { useStore } from '../../src/store';
import { Palette, categoryMeta, makeStyles, rarityMeta, useTheme } from '../../src/theme';
import { useLocation } from '../../src/useLocation';

const { width: SCREEN_W } = Dimensions.get('window');

export default function SpotDetailScreen() {
  const t = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const spot = spotById(id ?? '');

  const collections = useStore((s) => s.collections);
  const checkIn = useStore((s) => s.checkIn);
  const setDevLocation = useStore((s) => s.setDevLocation);
  const { location } = useLocation();

  const [unlocking, setUnlocking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);

  const entry = spot ? collections[spot.id] : undefined;
  const collected = !!entry;

  const dist = useMemo(
    () => (spot ? distanceMeters(location, spot) : Infinity),
    [location, spot]
  );

  if (!spot) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: t.subtext }}>找不到這個景點</Text>
      </View>
    );
  }

  const inRange = dist <= spot.checkinRadius;
  const rarity = rarityMeta[spot.rarity];
  const category = categoryMeta[spot.category];
  const dioramaSize = SCREEN_W - 48;

  const onCheckIn = () => {
    if (!inRange || collected) return;
    setUnlocking(true);
  };

  const onUnlockDone = () => {
    checkIn(spot.id);
    setUnlocking(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color={t.subtext} />
          </Pressable>
        </View>

        {/* Collected dioramas open full-screen for a closer look; locked ones stay a mystery. */}
        <Pressable
          disabled={!collected}
          onPress={() => setViewing(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`放大檢視 ${spot.name}`}
        >
          <Diorama spot={spot} size={dioramaSize} locked={!collected} live={collected} radius={24} />
          {collected && (
            <View style={styles.zoomBadge} pointerEvents="none">
              <Ionicons name="expand" size={14} color={t.text} />
            </View>
          )}
        </Pressable>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameEn}>{collected ? spot.nameEn : '????'}</Text>
            <Text style={styles.name}>{spot.name}</Text>
            <Text style={styles.city}>{spot.city}</Text>
          </View>
          {collected && entry && (
            <View style={styles.serialBadge}>
              <Text style={styles.serialText}>#{String(entry.order).padStart(3, '0')}</Text>
            </View>
          )}
        </View>

        <View style={styles.tagRow}>
          <View style={[styles.tag, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
            <MaterialCommunityIcons name={category.icon as any} size={13} color={t.subtext} />
            <Text style={styles.tagText}>{category.label}</Text>
          </View>
          <View style={[styles.tag, { borderColor: rarity.color }]}>
            <Text style={[styles.tagText, { color: rarity.color }]}>
              {Array.from({ length: rarity.dots })
                .map(() => '●')
                .join(' ')}{' '}
              {rarity.label}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{spot.description}</Text>

        {collected && entry ? (
          <View style={styles.collectedCard}>
            <Text style={styles.collectedLabel}>COLLECTED</Text>
            <Text style={styles.collectedDate}>
              {new Date(entry.checkedInAt)
                .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                .toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MaterialCommunityIcons
                name={'white-balance-sunny' as any}
                size={13}
                color={t.subtext}
              />
              <Text style={[styles.collectedVariant, { marginTop: 0 }]}>DAY VARIANT</Text>
            </View>
            <Pressable style={styles.shareBtn} onPress={() => setSharing(true)}>
              <Ionicons name="share-outline" size={16} color={t.onAccent} />
              <Text style={styles.shareBtnText}>分享收藏卡</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.checkinCard}>
            <Text style={styles.distText}>距離你 {formatDistance(dist)}</Text>
            {inRange ? (
              <Text style={styles.inRangeText}>● 你已抵達收藏範圍</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <MaterialCommunityIcons name={'lock' as any} size={12} color={t.faint} />
                <Text style={[styles.outRangeText, { marginTop: 0 }]}>
                  需進入 {spot.checkinRadius} m 範圍內才能收藏
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.checkinBtn, !inRange && styles.checkinBtnDisabled]}
              onPress={onCheckIn}
              disabled={!inRange}
            >
              <Text style={[styles.checkinBtnText, !inRange && { color: t.faint }]}>
                留下足跡
              </Text>
            </Pressable>
            {/* demo helper: teleport to this spot in the simulator */}
            {!inRange && (
              <Pressable
                style={styles.devBtn}
                onPress={() =>
                  setDevLocation({ latitude: spot.latitude, longitude: spot.longitude })
                }
              >
                <Text style={styles.devBtnText}>DEV・模擬抵達這裡</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <UnlockOverlay spot={spot} visible={unlocking} onDone={onUnlockDone} />
      {viewing && <DioramaViewer spot={spot} onClose={() => setViewing(false)} />}
      {collected && entry && (
        <ShareCardModal
          spot={spot}
          entry={entry}
          totalCollected={Object.keys(collections).length}
          totalSpots={SPOTS.length}
          visible={sharing}
          onClose={() => setSharing(false)}
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  zoomBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.6)' : 'rgba(255,255,255,0.85)',
  },
  safe: { flex: 1, backgroundColor: t.bgElevated },
  container: { padding: 24, paddingBottom: 48 },
  topBar: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  nameEn: { color: t.accent, fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  name: { color: t.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  city: { color: t.subtext, fontSize: 13, marginTop: 4 },
  serialBadge: {
    backgroundColor: t.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serialText: { color: t.accent, fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tag: {
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { color: t.subtext, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  description: { color: t.subtext, fontSize: 14, lineHeight: 22, marginTop: 16 },
  collectedCard: {
    backgroundColor: t.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  collectedLabel: { color: t.success, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  collectedDate: { color: t.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  collectedVariant: { color: t.subtext, fontSize: 12, marginTop: 6, letterSpacing: 1 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.accent,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 11,
    marginTop: 16,
  },
  shareBtnText: { color: t.onAccent, fontWeight: '700', fontSize: 14 },
  checkinCard: {
    backgroundColor: t.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  distText: { color: t.text, fontSize: 17, fontWeight: '700' },
  inRangeText: { color: t.success, fontSize: 13, marginTop: 8 },
  outRangeText: { color: t.faint, fontSize: 12, marginTop: 8 },
  checkinBtn: {
    backgroundColor: t.accent,
    borderRadius: 26,
    paddingHorizontal: 44,
    paddingVertical: 14,
    marginTop: 16,
  },
  checkinBtnDisabled: { backgroundColor: t.locked },
  checkinBtnText: { color: t.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  devBtn: { marginTop: 14 },
  devBtnText: { color: t.faint, fontSize: 12 },
  }),
);
