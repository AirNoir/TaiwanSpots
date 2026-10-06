import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACHIEVEMENTS } from '../../src/achievements';
import { SPOTS, spotById } from '../../src/data/spots';
import { distanceMeters } from '../../src/geo';
import { useStore } from '../../src/store';
import { categoryMeta, theme } from '../../src/theme';

export default function MeScreen() {
  const collections = useStore((s) => s.collections);
  const reset = useStore((s) => s.reset);

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
          <MaterialCommunityIcons name={'compass-rose' as any} size={40} color={theme.accent} />
        </View>
        <Text style={styles.name}>TRAVELER</Text>
        <Text style={styles.role}>Taiwan Explorer</Text>

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
                    color={theme.subtext}
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
                color={done ? theme.accent : theme.faint}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <Text style={styles.achZh}>{a.zh}</Text>
                <View style={styles.achBarTrack}>
                  <View
                    style={[
                      styles.achBarFill,
                      { width: `${Math.min(100, (now / goal) * 100)}%` },
                      done && { backgroundColor: theme.success },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.achProgress, done && { color: theme.success }]}>
                {now}/{goal}
              </Text>
            </View>
          );
        })}

        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>重置示範資料</Text>
        </Pressable>

        <Text style={styles.footer}>
          Money can make your world prettier.{'\n'}But only travel can make it bigger.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 24, paddingBottom: 48, alignItems: 'stretch' },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  name: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 14,
  },
  role: { color: theme.subtext, fontSize: 13, textAlign: 'center', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingVertical: 18,
    marginTop: 24,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statNum: { color: theme.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.faint, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  catName: { color: theme.text, fontSize: 14 },
  catCount: { color: theme.accent, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: theme.faint, fontSize: 12, letterSpacing: 3, marginTop: 30, marginBottom: 12 },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  achTitle: { color: theme.text, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  achZh: { color: theme.subtext, fontSize: 12, marginTop: 2 },
  achBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.locked,
    marginTop: 8,
    overflow: 'hidden',
  },
  achBarFill: { height: 4, borderRadius: 2, backgroundColor: theme.accent },
  achProgress: { color: theme.subtext, fontSize: 12, fontWeight: '600', marginLeft: 10 },
  resetBtn: {
    alignSelf: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  resetText: { color: theme.faint, fontSize: 13 },
  footer: {
    color: theme.faint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
