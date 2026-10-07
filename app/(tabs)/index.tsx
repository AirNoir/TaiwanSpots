import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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
import { TaiwanWorld } from '../../src/components/TaiwanWorld';
import { SPOTS, spotById } from '../../src/data/spots';
import { distanceMeters, formatDistance } from '../../src/geo';
import { useStore } from '../../src/store';
import { theme } from '../../src/theme';
import { useLocation } from '../../src/useLocation';

const { width: SCREEN_W } = Dimensions.get('window');

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night.';
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
}

export default function WorldScreen() {
  const router = useRouter();
  const collections = useStore((s) => s.collections);
  const { location } = useLocation();

  const collectedIds = useMemo(() => new Set(Object.keys(collections)), [collections]);
  const count = collectedIds.size;

  const nearby = useMemo(
    () =>
      SPOTS.filter((s) => !collectedIds.has(s.id))
        .map((s) => ({ spot: s, dist: distanceMeters(location, s) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3),
    [location, collectedIds]
  );

  const latest = useMemo(() => {
    const list = Object.values(collections).sort(
      (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
    );
    return list[0] ?? null;
  }, [collections]);

  const latestSpot = latest ? spotById(latest.spotId) : null;
  const mapW = SCREEN_W - 48;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.subGreeting}>去過的地方,會成為你的世界。</Text>

        <View style={styles.worldCard}>
          <Text style={styles.worldLabel}>MY TAIWAN WORLD</Text>
          <TaiwanWorld width={mapW} collectedIds={collectedIds} />
          <View style={styles.worldStats}>
            <Text style={styles.worldCount}>
              {count} <Text style={styles.worldTotal}>/ {SPOTS.length}</Text>
            </Text>
            <Text style={styles.worldExplored}>EXPLORED</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>NEAR YOU</Text>
        {nearby.map(({ spot, dist }) => (
          <Pressable
            key={spot.id}
            style={styles.nearRow}
            onPress={() => router.push(`/spot/${spot.id}`)}
          >
            <Diorama spot={spot} size={56} locked radius={14} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.nearName}>{spot.name}</Text>
              <Text style={styles.nearCity}>{spot.city}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MaterialCommunityIcons name={'map-marker' as any} size={13} color={theme.accent} />
              <Text style={styles.nearDist}>{formatDistance(dist)}</Text>
            </View>
          </Pressable>
        ))}

        {latestSpot && latest && (
          <>
            <Text style={styles.sectionTitle}>YOUR LATEST</Text>
            <Pressable
              style={styles.latestCard}
              onPress={() => router.push(`/spot/${latestSpot.id}`)}
            >
              <Diorama spot={latestSpot} size={SCREEN_W - 80} radius={20} />
              <Text style={styles.latestName}>{latestSpot.nameEn}</Text>
              <Text style={styles.latestDate}>
                {new Date(latest.checkedInAt).toLocaleDateString('zh-TW')}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.cta} onPress={() => router.push('/explore')}>
          <Text style={styles.ctaText}>Explore Nearby</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 24, paddingBottom: 48 },
  greeting: { color: theme.text, fontSize: 28, fontWeight: '800' },
  subGreeting: { color: theme.subtext, fontSize: 14, marginTop: 6, marginBottom: 20 },
  worldCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 12,
    alignItems: 'center',
  },
  worldLabel: {
    color: theme.faint,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 8,
    marginBottom: 4,
  },
  worldStats: { alignItems: 'center', marginTop: 4, marginBottom: 10 },
  worldCount: { color: theme.text, fontSize: 32, fontWeight: '800' },
  worldTotal: { color: theme.faint, fontSize: 20, fontWeight: '600' },
  worldExplored: { color: theme.accent, fontSize: 11, letterSpacing: 4, marginTop: 2 },
  sectionTitle: {
    color: theme.faint,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 28,
    marginBottom: 12,
  },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  nearName: { color: theme.text, fontSize: 16, fontWeight: '600' },
  nearCity: { color: theme.subtext, fontSize: 12, marginTop: 2 },
  nearDist: { color: theme.accent, fontSize: 13, fontWeight: '600' },
  latestCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 16,
    alignItems: 'center',
  },
  latestName: { color: theme.text, fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 14 },
  latestDate: { color: theme.subtext, fontSize: 12, marginTop: 4 },
  cta: {
    backgroundColor: theme.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  ctaText: { color: '#1B1405', fontSize: 16, fontWeight: '700' },
});
