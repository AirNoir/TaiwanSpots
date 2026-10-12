import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diorama } from '../../src/components/Diorama';
import { SPOTS } from '../../src/data/spots';
import { useStore } from '../../src/store';
import { Palette, makeStyles, regionMeta, useTheme } from '../../src/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 12;
const COLS = 3;
const CELL = (SCREEN_W - 40 - GAP * (COLS - 1)) / COLS;

export default function PassportScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const collections = useStore((s) => s.collections);
  const count = Object.keys(collections).length;
  const pct = Math.round((count / SPOTS.length) * 100);

  const regionProgress = useMemo(() => {
    return (['north', 'central', 'south', 'east'] as const).map((r) => {
      const spots = SPOTS.filter((s) => s.region === r);
      const got = spots.filter((s) => collections[s.id]).length;
      return { region: r, got, total: spots.length };
    });
  }, [collections]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={SPOTS}
        keyExtractor={(s) => s.id}
        numColumns={COLS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: GAP }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.title}>MY PASSPORT</Text>
            <Text style={styles.country}>TAIWAN</Text>
            <Text style={styles.count}>
              {count} <Text style={styles.countTotal}>/ {SPOTS.length}</Text>
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.pct}>{pct}%</Text>

            <View style={styles.regionRow}>
              {regionProgress.map(({ region, got, total }) => (
                <View key={region} style={styles.regionCell}>
                  <Text style={styles.regionLabel}>{regionMeta[region].zh}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <Text style={[styles.regionCount, got === total && { color: t.accent }]}>
                      {got}/{total}
                    </Text>
                    {got === total && (
                      <MaterialCommunityIcons name={'trophy' as any} size={13} color={t.accent} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: spot }) => {
          const collected = !!collections[spot.id];
          return (
            <Pressable
              style={{ width: CELL }}
              onPress={() => router.push(`/spot/${spot.id}`)}
            >
              <Diorama spot={spot} size={CELL} locked={!collected} radius={16} />
              <Text style={[styles.cellName, !collected && { color: t.faint }]} numberOfLines={1}>
                {collected ? spot.name : '????'}
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  title: { color: t.faint, fontSize: 12, letterSpacing: 4, marginTop: 12 },
  country: { color: t.text, fontSize: 30, fontWeight: '800', letterSpacing: 2, marginTop: 6 },
  count: { color: t.text, fontSize: 24, fontWeight: '700', marginTop: 14 },
  countTotal: { color: t.faint, fontSize: 17 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: t.locked,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: t.accent },
  pct: { color: t.accent, fontSize: 13, fontWeight: '700', marginTop: 6 },
  regionRow: {
    flexDirection: 'row',
    backgroundColor: t.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.cardBorder,
    marginTop: 16,
    paddingVertical: 12,
  },
  regionCell: { flex: 1, alignItems: 'center' },
  regionLabel: { color: t.subtext, fontSize: 11 },
  regionCount: { color: t.text, fontSize: 14, fontWeight: '700' },
  cellName: {
    color: t.text,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  }),
);
