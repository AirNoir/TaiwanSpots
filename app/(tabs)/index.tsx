import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeWeather, seasonMeta, skyIcon, useWeather } from '../../src/atmosphere';
import { Diorama } from '../../src/components/Diorama';
import { TaiwanWorld } from '../../src/components/TaiwanWorld';
import { SPOTS, spotById } from '../../src/data/spots';
import { TAIWAN } from '../../src/data/world';
import { checkinRadius, distanceMeters, formatDistance, LatLng } from '../../src/geo';
import { openDirections, travelModeFor } from '../../src/maps';
import { entrySeason, useActiveCollections } from '../../src/store';
import { makeStyles, Palette, useTheme } from '../../src/theme';
import { overrideWeather, useAtmosphereOverride, useNight, useSeason } from '../../src/useAtmosphere';
import { useLocation } from '../../src/useLocation';
import { useWidgetSync } from '../../src/widgets/sync';

const { width: SCREEN_W } = Dimensions.get('window');

// Weather is looked up for these four city centres only — never for the traveller's position.
const REGION_POINTS: LatLng[] = TAIWAN.regions.map((r) => ({ latitude: r.center[1], longitude: r.center[0] }));

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night.';
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
}

export default function WorldScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const collections = useActiveCollections();
  const { location, isFallback } = useLocation();
  useWidgetSync(location, !isFallback);

  const collectedIds = useMemo(() => new Set(Object.keys(collections)), [collections]);
  const count = collectedIds.size;

  const season = useSeason();
  const override = useAtmosphereOverride();
  const regionWeather = useWeather(REGION_POINTS).map((w) => overrideWeather(w, override));
  const weatherByRegion = Object.fromEntries(TAIWAN.regions.map((r, i) => [r.id, regionWeather[i]]));
  // The region whose city centre is closest to the traveller (computed on-device).
  const nearRegion = useMemo(
    () =>
      TAIWAN.regions.reduce((best, r, i) =>
        distanceMeters(location, REGION_POINTS[i]) <
        distanceMeters(location, REGION_POINTS[TAIWAN.regions.indexOf(best)])
          ? r
          : best,
      ),
    [location],
  );
  const hereWeather = weatherByRegion[nearRegion.id];
  const night = useNight(hereWeather);

  const nearby = useMemo(
    () =>
      SPOTS.filter((s) => !collectedIds.has(s.id))
        .map((s) => ({ spot: s, dist: distanceMeters(location, s) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 4),
    [location, collectedIds]
  );

  const nextStop = nearby[0] ? { ...nearby[0], inRange: nearby[0].dist <= checkinRadius(nearby[0].spot) } : null;

  const latest = useMemo(() => {
    const list = Object.values(collections).sort(
      (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
    );
    return list[0] ?? null;
  }, [collections]);

  const latestSpot = latest ? spotById(latest.spotId) : null;

  // Dev automation: lets the Metro inspector scroll this screen for screenshots.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!__DEV__) return;
    const g = globalThis as any;
    g.__islandiaHomeScroll = (y: number) => scrollRef.current?.scrollTo({ y, animated: false });
    return () => {
      delete g.__islandiaHomeScroll;
    };
  }, []);
  const mapW = SCREEN_W - 48;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.subGreeting}>去過的地方,會成為你的世界。</Text>
        <View style={styles.atmosRow}>
          <MaterialCommunityIcons name={seasonMeta[season].icon as any} size={13} color={t.subtext} />
          <Text style={styles.atmosText}>
            {seasonMeta[season].zh}
            {night ? '夜' : '天'}
          </Text>
          {hereWeather && (
            <>
              <Text style={styles.atmosText}>·</Text>
              <MaterialCommunityIcons name={skyIcon(hereWeather) as any} size={13} color={t.subtext} />
              <Text style={styles.atmosText}>
                {nearRegion.zh} {describeWeather(hereWeather)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.worldCard}>
          <Text style={styles.worldLabel}>MY TAIWAN WORLD</Text>
          <TaiwanWorld width={mapW} collectedIds={collectedIds} season={season} weather={weatherByRegion} night={night} location={location} />
          <View style={styles.worldStats}>
            <Text style={styles.worldCount}>
              {count} <Text style={styles.worldTotal}>/ {SPOTS.length}</Text>
            </Text>
            <Text style={styles.worldExplored}>EXPLORED</Text>
          </View>
        </View>

        {nextStop && (
          <>
            <Text style={styles.sectionTitle}>NEXT STOP</Text>
            <Pressable
              style={[styles.nextCard, nextStop.inRange && styles.nextCardReady]}
              onPress={() => router.push(`/spot/${nextStop.spot.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`下一站 ${nextStop.spot.name}`}
            >
              <Diorama spot={nextStop.spot} size={104} radius={18} />
              <View style={styles.nextBody}>
                <Text style={styles.nextKicker}>
                  {nextStop.inRange ? '你已抵達 · 現在就能收藏' : isFallback ? '離台北車站最近的景點' : '離你最近、還沒收藏'}
                </Text>
                <Text style={styles.nextName} numberOfLines={1}>
                  {nextStop.spot.name}
                </Text>
                <Text style={styles.nextCity} numberOfLines={1}>
                  {nextStop.spot.city}
                  {isFallback ? '' : ` · ${formatDistance(nextStop.dist)}`}
                </Text>
                <View style={styles.nextActions}>
                  <View style={[styles.nextBtn, styles.nextBtnPrimary]}>
                    <Text style={styles.nextBtnPrimaryText}>{nextStop.inRange ? '去收藏' : '看看'}</Text>
                  </View>
                  {!nextStop.inRange && (
                    <Pressable
                      style={styles.nextBtn}
                      onPress={() => void openDirections(nextStop.spot, travelModeFor(nextStop.dist), t.mode)}
                      hitSlop={6}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name={'navigation-variant-outline' as any} size={13} color={t.accent} />
                      <Text style={styles.nextBtnText}>導航</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          </>
        )}

        {nearby.length > 1 && <Text style={styles.sectionTitle}>ALSO NEAR YOU</Text>}
        {nearby.slice(1).map(({ spot, dist }) => (
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
            {dist <= checkinRadius(spot) ? (
              <Text style={styles.readyBadge}>可收藏</Text>
            ) : (
              !isFallback && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MaterialCommunityIcons name={'map-marker' as any} size={13} color={t.accent} />
                  <Text style={styles.nearDist}>{formatDistance(dist)}</Text>
                </View>
              )
            )}
          </Pressable>
        ))}

        {latestSpot && latest && (
          <>
            <Text style={styles.sectionTitle}>YOUR LATEST</Text>
            <Pressable
              style={styles.latestCard}
              onPress={() => router.push(`/spot/${latestSpot.id}`)}
            >
              <Diorama
                spot={latestSpot}
                size={SCREEN_W - 80}
                radius={20}
                atmosphere={{ season: override.season ?? entrySeason(latest), night }}
              />
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

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  container: { padding: 24, paddingBottom: 48 },
  greeting: { color: t.text, fontSize: 28, fontWeight: '800' },
  subGreeting: { color: t.subtext, fontSize: 14, marginTop: 6 },
  atmosRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, marginBottom: 20 },
  atmosText: { color: t.subtext, fontSize: 12 },
  worldCard: {
    backgroundColor: t.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 12,
    alignItems: 'center',
  },
  worldLabel: {
    color: t.faint,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 8,
    marginBottom: 4,
  },
  worldStats: { alignItems: 'center', marginTop: 4, marginBottom: 10 },
  worldCount: { color: t.text, fontSize: 32, fontWeight: '800' },
  worldTotal: { color: t.faint, fontSize: 20, fontWeight: '600' },
  worldExplored: { color: t.accent, fontSize: 11, letterSpacing: 4, marginTop: 2 },
  sectionTitle: {
    color: t.faint,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 28,
    marginBottom: 12,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 12,
  },
  nextCardReady: { borderColor: t.accent, backgroundColor: t.accentSoft },
  nextBody: { flex: 1, minWidth: 0 },
  nextKicker: { color: t.accent, fontSize: 11, fontWeight: '700' },
  nextName: { color: t.text, fontSize: 19, fontWeight: '800', marginTop: 3 },
  nextCity: { color: t.subtext, fontSize: 12, marginTop: 2 },
  nextActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.accent,
  },
  nextBtnPrimary: { backgroundColor: t.accent },
  nextBtnPrimaryText: { color: t.onAccent, fontSize: 12, fontWeight: '700' },
  nextBtnText: { color: t.accent, fontSize: 12, fontWeight: '700' },
  readyBadge: {
    color: t.onAccent,
    backgroundColor: t.accent,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  nearName: { color: t.text, fontSize: 16, fontWeight: '600' },
  nearCity: { color: t.subtext, fontSize: 12, marginTop: 2 },
  nearDist: { color: t.accent, fontSize: 13, fontWeight: '600' },
  latestCard: {
    backgroundColor: t.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
    alignItems: 'center',
  },
  latestName: { color: t.text, fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 14 },
  latestDate: { color: t.subtext, fontSize: 12, marginTop: 4 },
  cta: {
    backgroundColor: t.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  ctaText: { color: t.onAccent, fontSize: 16, fontWeight: '700' },
  }),
);
