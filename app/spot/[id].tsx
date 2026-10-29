import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { describeWeather, seasonMeta, skyIcon, skyName, useWeather } from '../../src/atmosphere';
import { collectionImage } from '../../src/data/spotAssets';
import { spotById, SPOTS } from '../../src/data/spots';
import { checkinRadius, distanceMeters, formatDistance } from '../../src/geo';
import { openDirections, travelModeFor } from '../../src/maps';
import { activeCollections, entrySeason, useStore } from '../../src/store';
import { Palette, accessHint, accessMeta, categoryMeta, makeStyles, useTheme } from '../../src/theme';
import { overrideWeather, useAtmosphereOverride, useNight, useSeason } from '../../src/useAtmosphere';
import { DEMO_TOOLS } from '../../src/demo';
import { nextIsSealed, useHasFull, useSealedSet } from '../../src/entitlements';
import { metaLabel, spotAltName, spotName, useLang, useT } from '../../src/i18n';
import { useDevScroll } from '../../src/useDevScroll';
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
  const paywallSeen = useStore((s) => s.paywallSeen);
  const setPaywallSeen = useStore((s) => s.setPaywallSeen);
  const full = useHasFull();
  const sealedSet = useSealedSet();
  const { location, isFallback } = useLocation();

  const scrollRef = useDevScroll('spot');
  const [unlocking, setUnlocking] = useState(false);
  // Dev automation: play the unlock moment from the Metro inspector.
  useEffect(() => {
    if (!__DEV__) return;
    const g = globalThis as any;
    const play = () => setUnlocking(true);
    g.__islandiaUnlock = play;
    return () => {
      if (g.__islandiaUnlock === play) delete g.__islandiaUnlock;
    };
  }, []);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);

  const entry = spot ? collections[spot.id] : undefined;
  const collected = !!entry;
  const sealed = !!spot && sealedSet.has(spot.id);
  // Decided before the check-in lands: the 11th collection onwards opens sealed without the full version.
  const landsSealed = !collected && nextIsSealed(collections, full);

  const dist = useMemo(
    () => (spot ? distanceMeters(location, spot) : Infinity),
    [location, spot]
  );
  // Weather at the spot itself (a fixed public coordinate — never the traveller's position).
  const [fetchedWeather] = useWeather(useMemo(() => (spot ? [spot] : []), [spot]));
  // Dev preview can force season / sky / night; in production the override is always empty.
  const override = useAtmosphereOverride();
  const weather = overrideWeather(fetchedWeather, override);
  const season = useSeason();
  const night = useNight(weather);
  const tr = useT();
  const lang = useLang();

  // Retired spots (active: false) stay viewable for whoever collected them, but can't be collected anew.
  if (!spot || (!spot.active && !entry)) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <MaterialCommunityIcons name={'map-marker-question-outline' as any} size={40} color={t.faint} />
        <Text style={{ color: t.subtext, fontSize: 15 }}>{tr('spot.notFound')}</Text>
        <Pressable
          style={styles.navBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
        >
          <Text style={styles.navBtnText}>{tr('spot.backToMap')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const radius = checkinRadius(spot);
  // Without GPS the position is only the Taipei Station fallback: never in range.
  const inRange = !isFallback && dist <= radius;
  const access = accessMeta[spot.access];
  const category = categoryMeta[spot.category];
  const dioramaSize = SCREEN_W - 48;
  // Spots whose art is still pending only have the procedural diorama — nothing to zoom into.
  const zoomable = collected && !sealed && !!collectionImage(spot.id);
  const openPaywall = () => router.push('/paywall');

  // A collected diorama keeps the season (and sky) it was collected in; a locked one shows today's.
  const shownSeason = entry && !override.season ? entrySeason(entry) : season;
  const atmosphere = { season: shownSeason, sky: entry && !override.sky ? entry.sky : weather?.sky, night };
  const travelMode = travelModeFor(dist);

  const onCheckIn = () => {
    if (!inRange || collected) return;
    setUnlocking(true);
  };

  const onUnlockDone = () => {
    checkIn(spot.id, { season, sky: weather?.sky, temperature: weather?.temperature });
    setUnlocking(false);
    // The paywall shows itself once, at the first sealed collection (spec §3.3).
    if (landsSealed && !paywallSeen) {
      setPaywallSeen();
      openPaywall();
    }
  };

  const onNavigate = () => {
    void openDirections(spot, travelMode, t.mode);
  };

  // Other spots within an easy hop of this one, for planning the next stop.
  const around = SPOTS.filter((s) => s.id !== spot.id)
    .map((s) => ({ spot: s, d: distanceMeters(spot, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)
    .filter((x) => x.d < 30_000);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color={t.subtext} />
          </Pressable>
        </View>

        {/* Collected dioramas open full-screen for a closer look; locked ones stay a mystery. */}
        <Pressable
          disabled={!zoomable && !sealed}
          onPress={() => (sealed ? openPaywall() : setViewing(true))}
          accessibilityRole="imagebutton"
          accessibilityLabel={sealed ? tr('spot.unseal') : tr('spot.zoom', { name: spotName(spot, lang) })}
        >
          <Diorama
            spot={spot}
            size={dioramaSize}
            locked={!collected}
            sealed={sealed}
            live={collected && !sealed}
            radius={24}
            atmosphere={atmosphere}
          />
          {zoomable && (
            <View style={styles.zoomBadge} pointerEvents="none">
              <Ionicons name="expand" size={14} color={t.text} />
            </View>
          )}
        </Pressable>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameEn}>{spotAltName(spot, lang)}</Text>
            <Text style={styles.name}>{spotName(spot, lang)}</Text>
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
            <Text style={styles.tagText}>{metaLabel(category, lang)}</Text>
          </View>
          <View style={[styles.tag, { borderColor: access.color }]}>
            <Text style={[styles.tagText, { color: access.color }]}>
              {Array.from({ length: access.dots })
                .map(() => '●')
                .join(' ')}{' '}
              {metaLabel(access, lang)} · {accessHint(access, lang)}
            </Text>
          </View>
          {/* today's season, and the weather at the spot once it has loaded */}
          <View style={[styles.tag, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
            <MaterialCommunityIcons name={seasonMeta[season].icon as any} size={13} color={t.subtext} />
            <Text style={styles.tagText}>
              {metaLabel(seasonMeta[season], lang)}
              {tr(night ? 'spot.night' : 'spot.day')}
            </Text>
            {weather ? (
              <>
                <MaterialCommunityIcons name={skyIcon(weather) as any} size={13} color={t.subtext} />
                <Text style={styles.tagText}>{describeWeather(weather, lang)}</Text>
              </>
            ) : night ? (
              <MaterialCommunityIcons name={'weather-night' as any} size={13} color={t.subtext} />
            ) : null}
          </View>
        </View>

        <Text style={styles.description}>{spot.description}</Text>

        {collected && entry ? (
          <View style={styles.collectedCard}>
            <Text style={styles.collectedLabel}>{tr('spot.collected')}</Text>
            <Text style={styles.collectedDate}>
              {new Date(entry.checkedInAt)
                .toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: lang === 'zh' ? 'long' : 'short', day: '2-digit', year: 'numeric' })
                .toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MaterialCommunityIcons
                name={seasonMeta[shownSeason].icon as any}
                size={13}
                color={t.subtext}
              />
              <Text style={[styles.collectedVariant, { marginTop: 0 }]}>
                {tr('spot.variant', { season: metaLabel(seasonMeta[shownSeason], lang) })}
                {entry.sky
                  ? ` · ${skyName(entry.sky, lang)}${entry.temperature != null ? ` ${entry.temperature}°` : ''}`
                  : ''}
              </Text>
            </View>
            {sealed ? (
              <>
                <Text style={styles.sealedNote}>{tr('spot.sealed')}</Text>
                <Pressable style={styles.shareBtn} onPress={openPaywall} accessibilityRole="button">
                  <MaterialCommunityIcons name={'package-variant' as any} size={16} color={t.onAccent} />
                  <Text style={styles.shareBtnText}>{tr('spot.unseal')}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.shareBtn} onPress={() => setSharing(true)}>
                <Ionicons name="share-outline" size={16} color={t.onAccent} />
                <Text style={styles.shareBtnText}>{tr('spot.share')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.navLink} onPress={onNavigate} accessibilityRole="button">
              <MaterialCommunityIcons name={'navigation-variant-outline' as any} size={14} color={t.subtext} />
              <Text style={styles.navLinkText}>{tr('spot.revisit')}{isFallback ? '' : ` · ${formatDistance(dist)}`}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.checkinCard}>
            <Text style={styles.distText}>
              {isFallback ? tr('spot.noLocation') : tr('spot.distance', { d: formatDistance(dist) })}
            </Text>
            {inRange ? (
              <Text style={styles.inRangeText}>{tr('spot.arrived')}</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <MaterialCommunityIcons name={'lock' as any} size={12} color={t.faint} />
                <Text style={[styles.outRangeText, { marginTop: 0 }]}>
                  {tr('spot.needRange', { d: formatDistance(radius) })}
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.checkinBtn, !inRange && styles.checkinBtnDisabled]}
              onPress={onCheckIn}
              disabled={!inRange}
            >
              <Text style={[styles.checkinBtnText, !inRange && { color: t.faint }]}>
                {tr('spot.checkIn')}
              </Text>
            </Pressable>
            {/* hands the spot to Apple / Google Maps on the phone */}
            <Pressable style={styles.navBtn} onPress={onNavigate} accessibilityRole="button">
              <MaterialCommunityIcons name={'navigation-variant-outline' as any} size={16} color={t.accent} />
              <Text style={styles.navBtnText}>{tr(travelMode === 'walking' ? 'spot.walk' : 'spot.drive')}</Text>
            </Pressable>
            {/* demo helper: teleport to this spot in the simulator */}
            {DEMO_TOOLS && !inRange && (
              <Pressable
                style={styles.devBtn}
                onPress={() =>
                  setDevLocation({ latitude: spot.latitude, longitude: spot.longitude })
                }
              >
                <Text style={styles.devBtnText}>{tr('spot.demoTeleport')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {around.length > 0 && (
          <>
            <Text style={styles.aroundTitle}>{tr('spot.around')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {around.map(({ spot: s, d }) => (
                <Pressable
                  key={s.id}
                  style={styles.aroundCard}
                  onPress={() => router.replace(`/spot/${s.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={tr('spot.aroundA11y', { name: spotName(s, lang), d: formatDistance(d) })}
                >
                  <Diorama spot={s} size={96} radius={14} locked={!collections[s.id]} sealed={sealedSet.has(s.id)} />
                  <Text style={styles.aroundName} numberOfLines={1}>
                    {collections[s.id] ? '✓ ' : ''}
                    {spotName(s, lang)}
                  </Text>
                  <Text style={styles.aroundDist}>{tr('spot.aroundDist', { d: formatDistance(d) })}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <UnlockOverlay spot={spot} visible={unlocking} sealed={landsSealed} onDone={onUnlockDone} />
      {viewing && <DioramaViewer spot={spot} onClose={() => setViewing(false)} />}
      {collected && entry && !sealed && (
        <ShareCardModal
          spot={spot}
          entry={entry}
          totalCollected={Object.keys(activeCollections(collections)).length}
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
  sealedNote: { color: t.subtext, fontSize: 13, marginTop: 10 },
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
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
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.accent,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  navBtnText: { color: t.accent, fontWeight: '700', fontSize: 14 },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  navLinkText: { color: t.subtext, fontSize: 12 },
  devBtn: { marginTop: 14 },
  devBtnText: { color: t.faint, fontSize: 12 },
  aroundTitle: { color: t.faint, fontSize: 12, letterSpacing: 3, marginTop: 32, marginBottom: 12 },
  aroundCard: { width: 96 },
  aroundName: { color: t.text, fontSize: 13, fontWeight: '700', marginTop: 6 },
  aroundDist: { color: t.subtext, fontSize: 11, marginTop: 1 },
  }),
);
