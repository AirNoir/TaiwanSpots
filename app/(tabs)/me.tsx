import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACHIEVEMENTS } from '../../src/achievements';
import { DEMO_TOOLS } from '../../src/demo';
import { SEASONS, seasonMeta, Sky, skyMeta } from '../../src/atmosphere';
import { spotById, SPOTS } from '../../src/data/spots';
import { distanceMeters } from '../../src/geo';
import { useActiveCollections, useStore } from '../../src/store';
import { Palette, ThemeMode, categoryMeta, makeStyles, useTheme } from '../../src/theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: '淺色', icon: 'white-balance-sunny' },
  { mode: 'dark', label: '深色', icon: 'weather-night' },
];

// Dev preview choices (value '' = automatic). Skies limited to the ones that look different.
const PREVIEW_SKIES: Sky[] = ['clear', 'cloudy', 'overcast', 'fog', 'rain', 'thunder', 'snow'];

// Traveller titles by collection size; the last one is every active spot.
const RANKS = [
  { at: 0, title: 'NEWCOMER', zh: '初來乍到' },
  { at: 1, title: 'TRAVELER', zh: '旅人' },
  { at: 10, title: 'CITY WALKER', zh: '城市漫遊者' },
  { at: 30, title: 'ISLAND EXPLORER', zh: '島嶼探險家' },
  { at: 60, title: 'FORMOSA HAND', zh: '寶島達人' },
  { at: 100, title: 'TAIWAN SAGE', zh: '台灣通' },
  { at: SPOTS.length, title: 'ISLAND KEEPER', zh: '島嶼守護者' },
];

function rankFor(n: number) {
  let i = 0;
  while (i + 1 < RANKS.length && n >= RANKS[i + 1].at) i++;
  return { ...RANKS[i], next: RANKS[i + 1] ?? null };
}

export default function MeScreen() {
  const t = useTheme();
  const styles = useStyles();
  const collections = useActiveCollections();
  const reset = useStore((s) => s.reset);
  const unlockAll = useStore((s) => s.unlockAll);
  const themeMode = useStore((s) => s.themeMode);
  const setThemeMode = useStore((s) => s.setThemeMode);
  const override = useStore((s) => s.atmosphereOverride);
  const setOverride = useStore((s) => s.setAtmosphereOverride);

  const collected = useMemo(
    () =>
      Object.values(collections).sort(
        (a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
      ),
    [collections]
  );

  const cities = useMemo(() => {
    const set = new Set(
      collected.map((c) => spotById(c.spotId)?.city.split('・')[0]).filter(Boolean)
    );
    return set.size;
  }, [collected]);

  const journeyKm = useMemo(() => {
    let total = 0;
    for (let i = 1; i < collected.length; i++) {
      const a = spotById(collected[i - 1].spotId);
      const b = spotById(collected[i].spotId);
      if (a && b) total += distanceMeters(a, b);
    }
    return Math.round(total / 1000);
  }, [collected]);

  const rank = rankFor(collected.length);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    collected.forEach((c) => {
      const s = spotById(c.spotId);
      if (s) counts[s.category] = (counts[s.category] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [collected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name={'compass-rose' as any} size={40} color={t.accent} />
        </View>
        <Text style={styles.name}>{rank.title}</Text>
        <Text style={styles.role}>{rank.zh}</Text>
        {rank.next && (
          <Text style={styles.rankNext}>
            再收藏 {rank.next.at - collected.length} 個，成為「{rank.next.zh}」
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{collected.length}</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{cities}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{journeyKm.toLocaleString()}</Text>
            <Text style={styles.statLabel}>km Journey</Text>
          </View>
        </View>

        {catCounts.length > 0 && (
          <View style={styles.card}>
            {catCounts.map(([cat, n]) => (
              <View key={cat} style={styles.catRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialCommunityIcons
                    name={categoryMeta[cat].icon as any}
                    size={17}
                    color={t.subtext}
                  />
                  <Text style={styles.catName}>{categoryMeta[cat].zh}</Text>
                </View>
                <Text style={styles.catCount}>{n}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
        {ACHIEVEMENTS.map((a) => {
          const done = a.check(collected);
          const { now, goal } = a.progress(collected);
          return (
            <View key={a.id} style={[styles.achRow, !done && { opacity: 0.55 }]}>
              <MaterialCommunityIcons
                name={(done ? a.icon : 'lock') as any}
                size={26}
                color={done ? t.accent : t.faint}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <Text style={styles.achZh}>{a.zh}</Text>
                <View style={styles.achBarTrack}>
                  <View
                    style={[
                      styles.achBarFill,
                      { width: `${Math.min(100, (now / goal) * 100)}%` },
                      done && { backgroundColor: t.success },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.achProgress, done && { color: t.success }]}>
                {now}/{goal}
              </Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.segment}>
          {THEME_OPTIONS.map((o) => {
            const on = o.mode === themeMode;
            return (
              <Pressable
                key={o.mode}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
                onPress={() => setThemeMode(o.mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <MaterialCommunityIcons name={o.icon as any} size={16} color={on ? t.onAccent : t.subtext} />
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {__DEV__ && (
          <>
            {/* Preview any season / time of day / sky; forces every screen until set back to 自動. */}
            <Text style={styles.sectionTitle}>DEV · 預覽季節 / 日夜 / 天氣</Text>
            <Text style={styles.devLabel}>季節</Text>
            <View style={styles.chipRow}>
              {[['', '自動'], ...SEASONS.map((s) => [s, seasonMeta[s].zh])].map(([v, label]) => {
                const on = (override.season ?? '') === v;
                return (
                  <Pressable
                    key={v}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setOverride({ ...override, season: (v || undefined) as typeof override.season })}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.devLabel}>日夜</Text>
            <View style={styles.chipRow}>
              {[
                ['', '自動'],
                ['day', '白天'],
                ['night', '夜晚'],
              ].map(([v, label]) => {
                const cur = override.night == null ? '' : override.night ? 'night' : 'day';
                const on = cur === v;
                return (
                  <Pressable
                    key={v}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setOverride({ ...override, night: v === '' ? undefined : v === 'night' })}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.devLabel}>天氣</Text>
            <View style={styles.chipRow}>
              {[['', '自動'], ...PREVIEW_SKIES.map((s) => [s, skyMeta[s].zh])].map(([v, label]) => {
                const on = (override.sky ?? '') === v;
                return (
                  <Pressable
                    key={v}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setOverride({ ...override, sky: (v || undefined) as Sky | undefined })}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.resetBtn} onPress={unlockAll}>
              <Text style={styles.resetText}>解鎖全部景點（開發用）</Text>
            </Pressable>
          </>
        )}
        {DEMO_TOOLS && (
          <Pressable
            style={styles.resetBtn}
            onPress={() =>
              Alert.alert('重置示範資料？', '會清除所有收藏並回到開場導覽，無法復原。', [
                { text: '取消', style: 'cancel' },
                { text: '重置', style: 'destructive', onPress: reset },
              ])
            }
          >
            <Text style={styles.resetText}>重置示範資料</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>
          Money can make your world prettier.{'\n'}But only travel can make it bigger.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { padding: 24, paddingBottom: 48, alignItems: 'stretch' },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  name: {
    color: t.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 14,
  },
  rankNext: { color: t.accent, fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  role: { color: t.subtext, fontSize: 13, textAlign: 'center', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: t.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.cardBorder,
    paddingVertical: 18,
    marginTop: 24,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statNum: { color: t.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: t.faint, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: t.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  catName: { color: t.text, fontSize: 14 },
  catCount: { color: t.accent, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: t.faint, fontSize: 12, letterSpacing: 3, marginTop: 30, marginBottom: 12 },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  achTitle: { color: t.text, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  achZh: { color: t.subtext, fontSize: 12, marginTop: 2 },
  achBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: t.locked,
    marginTop: 8,
    overflow: 'hidden',
  },
  achBarFill: { height: 4, borderRadius: 2, backgroundColor: t.accent },
  achProgress: { color: t.subtext, fontSize: 12, fontWeight: '600', marginLeft: 10 },
  resetBtn: {
    alignSelf: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  resetText: { color: t.faint, fontSize: 13 },
  segment: {
    flexDirection: 'row',
    backgroundColor: t.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentItemOn: { backgroundColor: t.accent },
  segmentText: { color: t.subtext, fontSize: 14, fontWeight: '600' },
  segmentTextOn: { color: t.onAccent },
  devLabel: { color: t.faint, fontSize: 11, letterSpacing: 2, marginTop: 10, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: t.card,
  },
  chipOn: { backgroundColor: t.accentSoft, borderColor: t.accent },
  chipText: { color: t.subtext, fontSize: 12 },
  chipTextOn: { color: t.accent, fontWeight: '600' },
  footer: {
    color: t.faint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  }),
);
