import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { collectionThumbnail, DIORAMA_BG } from '../data/spotAssets';
import { Spot } from '../data/spots';
import { countyLabel, labelWidth, spotName, useLang } from '../i18n';
import { makeStyles, Palette, useTheme } from '../theme';

/** A county folded into one bubble on the region view. */
export type RealCluster = { county: string; cover: Spot; total: number; found: number; latitude: number; longitude: number };

interface Props {
  width: number;
  height: number;
  /** Spots drawn one by one (a county, or the small counties of a region). */
  spots: Spot[];
  /** Counties shown as bubbles (region view only). */
  clusters: RealCluster[];
  collectedIds: Set<string>;
  selectedId: string | null;
  targetId: string | null;
  /** Changes whenever the camera should refit (region or county opened). */
  focusKey: string;
  dark: boolean;
  showsUser: boolean;
  onSelect: (spot: Spot) => void;
  onOpenCounty: (county: string) => void;
  onBackground: () => void;
}

const PIN = 38;
const PIN_ON = 50;
const BUBBLE = 52;
// label heights, mirrored as top padding so each marker view stays centred on its coordinate
const LABEL_H = 18;
const BUBBLE_LABEL_H = 23;
// room for the header row (back button / place name) and the docked callout
const EDGE = { top: 90, right: 44, bottom: 96, left: 44 };

/**
 * The real Apple / Google map behind a region or county: actual streets,
 * districts and place names, with each spot's diorama as its pin.
 */
export function RealMap({
  width,
  height,
  spots,
  clusters,
  collectedIds,
  selectedId,
  targetId,
  focusKey,
  dark,
  showsUser,
  onSelect,
  onOpenCounty,
  onBackground,
}: Props) {
  const ref = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  const fitTo = useMemo(
    () => [
      ...spots.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
      ...clusters.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
    ],
    [spots, clusters],
  );

  // Refit when a region or county opens; a single spot gets a neighbourhood-sized view.
  useEffect(() => {
    if (!ready || !fitTo.length) return;
    if (fitTo.length === 1) {
      ref.current?.animateCamera({ center: fitTo[0], altitude: 6000, zoom: 13 }, { duration: 500 });
    } else {
      ref.current?.fitToCoordinates(fitTo, { edgePadding: EDGE, animated: true });
    }
    // fitTo is derived from focusKey's spots; refitting on every GPS tick would fight the user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey]);

  // Picking a spot from the strip brings it into view without changing the zoom.
  useEffect(() => {
    if (!ready || !selectedId) return;
    const s = spots.find((x) => x.id === selectedId);
    if (s) ref.current?.animateCamera({ center: { latitude: s.latitude, longitude: s.longitude } }, { duration: 350 });
  }, [ready, selectedId, spots]);

  // Names go under pins wherever they fit at the current zoom: project each spot to
  // screen space (linear is fine at county scale) and place labels greedily.
  const [camera, setCamera] = useState<Region | null>(null);
  const lang = useLang();
  const labelled = useMemo(() => {
    const out = new Set<string>();
    if (!camera) return out;
    const x0 = camera.longitude - camera.longitudeDelta / 2;
    const y0 = camera.latitude + camera.latitudeDelta / 2;
    const px = (s: Spot) => ({
      x: ((s.longitude - x0) / camera.longitudeDelta) * width,
      y: ((y0 - s.latitude) / camera.latitudeDelta) * height,
    });
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const boxes: Box[] = spots.map((s) => {
      const p = px(s);
      return { x0: p.x - PIN / 2, y0: p.y - PIN / 2, x1: p.x + PIN / 2, y1: p.y + PIN / 2 };
    });
    const hit = (b: Box) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const rank = (s: Spot) => (s.id === targetId ? 0 : 2) + (s.worldTier === 'anchor' ? 0 : 1);
    for (const s of [...spots].sort((a, b) => rank(a) - rank(b))) {
      const p = px(s);
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      const w = labelWidth(spotName(s, lang)) + 2;
      const b = { x0: p.x - w / 2, y0: p.y + PIN / 2 + 1, x1: p.x + w / 2, y1: p.y + PIN / 2 + LABEL_H };
      if (hit(b)) continue;
      boxes.push(b);
      out.add(s.id);
    }
    return out;
  }, [camera, spots, width, height, targetId, lang]);

  // County bubbles whose centres nearly coincide (Taipei / New Taipei / Keelung) are
  // pushed apart on screen at the current zoom, then mapped back to coordinates.
  const placedClusters = useMemo(() => {
    if (!camera || clusters.length < 2) return clusters;
    const sx = width / camera.longitudeDelta;
    const sy = height / camera.latitudeDelta;
    const pts = clusters.map((c) => ({ x: c.longitude * sx, y: -c.latitude * sy }));
    const minD = BUBBLE + 24; // bubble plus its name tag
    for (let iter = 0; iter < 60; iter++) {
      let moved = false;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j].x - pts[i].x;
          const dy = pts[j].y - pts[i].y;
          const d = Math.hypot(dx, dy);
          if (d >= minD) continue;
          const ux = d ? dx / d : 1;
          const uy = d ? dy / d : 0;
          const push = (minD - d) / 2;
          pts[i].x -= ux * push;
          pts[i].y -= uy * push;
          pts[j].x += ux * push;
          pts[j].y += uy * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return clusters.map((c, i) => ({ ...c, longitude: pts[i].x / sx, latitude: -pts[i].y / sy }));
  }, [camera, clusters, width, height]);

  // Custom marker views are snapshotted; keep tracking until the thumbnails have drawn.
  const viewKey = `${focusKey}|${selectedId}|${collectedIds.size}|${[...labelled].join(',')}|${lang}`;
  const [settledKey, setSettledKey] = useState('');
  const tracking = settledKey !== viewKey;
  useEffect(() => {
    const id = setTimeout(() => setSettledKey(viewKey), 800);
    return () => clearTimeout(id);
  }, [viewKey]);

  return (
    <MapView
      ref={ref}
      style={{ width, height }}
      mapType="mutedStandard"
      userInterfaceStyle={dark ? 'dark' : 'light'}
      pitchEnabled={false}
      rotateEnabled={false}
      showsCompass={false}
      showsBuildings={false}
      showsPointsOfInterests={false}
      showsUserLocation={showsUser}
      toolbarEnabled={false}
      initialRegion={{ latitude: 23.7, longitude: 120.95, latitudeDelta: 3.6, longitudeDelta: 2.4 }}
      onMapReady={() => setReady(true)}
      onRegionChangeComplete={setCamera}
      onPress={(e) => {
        // marker taps also reach the map on iOS; only plain map taps clear the selection
        if (e.nativeEvent.action !== 'marker-press') onBackground();
      }}
    >
      {placedClusters.map((c) => (
        <Marker
          key={`c:${c.county}`}
          coordinate={{ latitude: c.latitude, longitude: c.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracking}
          onPress={() => onOpenCounty(c.county)}
        >
          <Bubble cluster={c} />
        </Marker>
      ))}
      {spots.map((s) => (
        <Marker
          key={s.id}
          coordinate={{ latitude: s.latitude, longitude: s.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracking}
          zIndex={s.id === selectedId ? 3 : s.id === targetId ? 2 : 1}
          onPress={() => onSelect(s)}
        >
          <Pin
            spot={s}
            got={collectedIds.has(s.id)}
            on={s.id === selectedId}
            goal={s.id === targetId}
            label={labelled.has(s.id) && s.id !== selectedId}
          />
        </Marker>
      ))}
    </MapView>
  );
}

function Pin({ spot, got, on, goal, label }: { spot: Spot; got: boolean; on: boolean; goal: boolean; label: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const lang = useLang();
  const d = on ? PIN_ON : PIN;
  const thumb = collectionThumbnail(spot.id);
  // the marker view is centred on the spot: keep the label space symmetric above and below
  return (
    <View style={{ alignItems: 'center', paddingTop: label ? LABEL_H : 0 }}>
      <View
        style={[
          styles.pin,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderColor: on || goal ? t.accent : got ? '#FFFFFF' : `rgba(${t.world.pin},0.5)`,
          },
        ]}
      >
        {thumb ? (
          <Image source={thumb} style={{ width: d * 1.25, height: d * 1.25 }} />
        ) : (
          <MaterialCommunityIcons name={spot.art.icon as any} size={d * 0.5} color={spot.art.tint} />
        )}
        {!got && <View style={[StyleSheet.absoluteFill, styles.fog]} />}
      </View>
      {label && (
        <Text numberOfLines={1} style={[styles.label, !got && styles.labelFaint]}>
          {spotName(spot, lang)}
        </Text>
      )}
    </View>
  );
}

function Bubble({ cluster }: { cluster: RealCluster }) {
  const t = useTheme();
  const styles = useStyles();
  const lang = useLang();
  const thumb = collectionThumbnail(cluster.cover.id);
  const done = cluster.found === cluster.total;
  return (
    <View style={{ alignItems: 'center', paddingTop: BUBBLE_LABEL_H }}>
      <View style={{ width: BUBBLE, height: BUBBLE }}>
        <View style={[styles.bubble, { borderColor: done ? t.accent : '#FFFFFF' }]}>
          {thumb && <Image source={thumb} style={{ width: BUBBLE * 1.25, height: BUBBLE * 1.25 }} />}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cluster.total}</Text>
        </View>
      </View>
      <Text style={styles.bubbleLabel} numberOfLines={1}>
        {countyLabel(cluster.county, lang)} <Text style={styles.bubbleProgress}>{cluster.found}/{cluster.total}</Text>
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    pin: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2.5,
      backgroundColor: DIORAMA_BG,
    },
    fog: { backgroundColor: t.mode === 'dark' ? 'rgba(20,28,44,0.45)' : 'rgba(242,237,226,0.5)' },
    label: {
      marginTop: 1,
      height: LABEL_H - 1,
      maxWidth: 120,
      color: t.text,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.78)' : 'rgba(255,255,255,0.9)',
    },
    labelFaint: { color: t.subtext, fontWeight: '600' },
    bubble: {
      width: BUBBLE,
      height: BUBBLE,
      borderRadius: BUBBLE / 2,
      borderWidth: 3,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DIORAMA_BG,
    },
    badge: {
      position: 'absolute',
      right: -4,
      top: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    badgeText: { color: t.onAccent, fontSize: 10, fontWeight: '800' },
    bubbleLabel: {
      marginTop: 3,
      height: BUBBLE_LABEL_H - 3,
      color: t.text,
      fontSize: 12,
      fontWeight: '800',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.8)' : 'rgba(255,255,255,0.92)',
    },
    bubbleProgress: { color: t.accent, fontSize: 11, fontWeight: '700' },
  }),
);
