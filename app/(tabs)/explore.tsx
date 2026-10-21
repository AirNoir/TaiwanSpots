import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diorama } from '../../src/components/Diorama';
import { Region, SPOTS } from '../../src/data/spots';
import { DEMO_TOOLS } from '../../src/demo';
import { checkinRadius, DEV_LOCATIONS, distanceMeters, formatDistance } from '../../src/geo';
import { entrySeason, useActiveCollections, useStore } from '../../src/store';
import { Palette, categoryMeta, makeStyles, rarityMeta, regionMeta, useTheme } from '../../src/theme';
import { useAtmosphereOverride, useNight } from '../../src/useAtmosphere';
import { useLocation } from '../../src/useLocation';

const REGION_FILTERS: (Region | 'all')[] = ['all', 'north', 'central', 'south', 'east'];

export default function ExploreScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const collections = useActiveCollections();
  const devLocation = useStore((s) => s.devLocation);
  const setDevLocation = useStore((s) => s.setDevLocation);
  const { location, isDev, isFallback } = useLocation();
  const [region, setRegion] = useState<Region | 'all'>('all');
  const override = useAtmosphereOverride();
  const night = useNight();

  const rows = useMemo(
    () =>
      SPOTS.filter((s) => region === 'all' || s.region === region)
        .map((s) => ({
          spot: s,
          dist: distanceMeters(location, s),
          collected: !!collections[s.id],
        }))
        .sort((a, b) => a.dist - b.dist),
    [location, collections, region]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>EXPLORE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <MaterialCommunityIcons
            name={(isDev ? 'flask-outline' : 'map-marker') as any}
            size={13}
            color={t.subtext}
          />
          <Text style={styles.subtitle}>
            {isDev ? '模擬位置' : isFallback ? '預設位置(台北車站)' : '目前位置'}
          </Text>
        </View>
      </View>

      {/* Demo location presets (dev / demo builds only) */}
      {DEMO_TOOLS && (
        <View style={styles.devRow}>
          {DEV_LOCATIONS.map((d) => {
            const active =
              devLocation?.latitude === d.coord.latitude &&
              devLocation?.longitude === d.coord.longitude;
            return (
              <Pressable
                key={d.label}
                style={[styles.devChip, active && styles.devChipActive]}
                onPress={() => setDevLocation(active ? null : d.coord)}
              >
                <Text style={[styles.devChipText, active && styles.devChipTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.filterRow}>
        {REGION_FILTERS.map((r) => (
          <Pressable
            key={r}
            style={[styles.filterChip, region === r && styles.filterChipActive]}
            onPress={() => setRegion(r)}
          >
            <Text style={[styles.filterText, region === r && styles.filterTextActive]}>
              {r === 'all' ? '全部' : regionMeta[r].zh}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.spot.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const { spot, dist, collected } = item;
          const inRange = dist <= checkinRadius(spot);
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/spot/${spot.id}`)}>
              <Diorama
                spot={spot}
                size={64}
                locked={!collected}
                radius={16}
                atmosphere={collected ? { season: override.season ?? entrySeason(collections[spot.id]), night } : undefined}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.name}>{spot.name}</Text>
                  {collected && (
                    <MaterialCommunityIcons
                      name={'check-circle' as any}
                      size={15}
                      color={t.success}
                    />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <MaterialCommunityIcons
                    name={categoryMeta[spot.category].icon as any}
                    size={12}
                    color={t.subtext}
                  />
                  <Text style={styles.meta}>
                    {categoryMeta[spot.category].label} ・ {spot.city}
                  </Text>
                </View>
                <View style={styles.rarityRow}>
                  {Array.from({ length: rarityMeta[spot.rarity].dots }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.rarityDot, { backgroundColor: rarityMeta[spot.rarity].color }]}
                    />
                  ))}
                  <Text style={[styles.rarityLabel, { color: rarityMeta[spot.rarity].color }]}>
                    {rarityMeta[spot.rarity].label}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.dist, inRange && { color: t.success }]}>
                  {formatDistance(dist)}
                </Text>
                {inRange && !collected && <Text style={styles.inRange}>● 可收藏</Text>}
              </View>
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
  header: { paddingHorizontal: 20, paddingTop: 12 },
  title: { color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: t.subtext, fontSize: 12, marginTop: 4 },
  devRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  devChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  devChipActive: { backgroundColor: t.accentSoft, borderColor: t.accent },
  devChipText: { color: t.faint, fontSize: 12 },
  devChipTextActive: { color: t.accent, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: t.card,
  },
  filterChipActive: { backgroundColor: t.accent },
  filterText: { color: t.subtext, fontSize: 13 },
  filterTextActive: { color: t.onAccent, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  name: { color: t.text, fontSize: 16, fontWeight: '600' },
  meta: { color: t.subtext, fontSize: 11, marginTop: 3 },
  rarityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 3 },
  rarityDot: { width: 5, height: 5, borderRadius: 3 },
  rarityLabel: { fontSize: 9, letterSpacing: 1.5, marginLeft: 4, fontWeight: '700' },
  dist: { color: t.subtext, fontSize: 13, fontWeight: '600' },
  inRange: { color: t.success, fontSize: 10, marginTop: 4 },
  }),
);
