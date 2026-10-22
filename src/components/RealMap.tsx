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
const LABEL_MAX = 120;
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
  const styles = useStyles();
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

  const lang = useLang();
  const [camera, setCamera] = useState<Region | null>(null);

  // Pins that would overlap at the current zoom (Wanhua, Zhongzheng…) are pushed
  // apart on screen, then mapped back; zooming in shrinks the shift to nothing.
  const placed = useMemo(() => {
    const out = new Map<string, { latitude: number; longitude: number; x: number; y: number }>();
    if (!camera) return out;
    const sx = width / camera.longitudeDelta;
    const sy = height / camera.latitudeDelta;
    const x0 = camera.longitude - camera.longitudeDelta / 2;
    const y0 = camera.latitude + camera.latitudeDelta / 2;
    const pts = spots.map((s) => ({ x: (s.longitude - x0) * sx, y: (y0 - s.latitude) * sy }));
    const minD = PIN + 6;
    for (let iter = 0; iter < 80; iter++) {
      let moved = false;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j].x - pts[i].x;
          const dy = pts[j].y - pts[i].y;
          const d = Math.hypot(dx, dy);
          if (d >= minD) continue;
          // identical coordinates split along a stable, per-pair angle
          const a = d ? 0 : (i * 2.39996 + j) % (Math.PI * 2);
          const ux = d ? dx / d : Math.cos(a);
          const uy = d ? dy / d : Math.sin(a);
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
    spots.forEach((s, i) =>
      out.set(s.id, { x: pts[i].x, y: pts[i].y, longitude: x0 + pts[i].x / sx, latitude: y0 - pts[i].y / sy }),
    );
    return out;
  }, [camera, spots, width, height]);

  // Names beside pins wherever they fit at the current zoom, greedily by priority:
  // the next stop, then everything still to collect, then the rest.
  const labels = useMemo(() => {
    // each name is its own marker: iOS sizes an annotation once, so a pin that grew a
    // label later would drift off its coordinate
    const out = new Map<string, { side: LabelSide; width: number; latitude: number; longitude: number }>();
    if (!camera) return out;
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const boxes: Box[] = [];
    for (const s of spots) {
      const p = placed.get(s.id);
      if (p) boxes.push({ x0: p.x - PIN / 2, y0: p.y - PIN / 2, x1: p.x + PIN / 2, y1: p.y + PIN / 2 });
    }
    const pinCount = boxes.length;
    // the next stop's name may sit over another pin; other names avoid everything
    const hit = (b: Box, goal: boolean) =>
      boxes.some((o, i) => (!goal || i >= pinCount) && b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const rank = (s: Spot) =>
      (s.id === targetId ? 0 : 4) + (collectedIds.has(s.id) ? 2 : 0) + (s.worldTier === 'anchor' ? 0 : 1);
    for (const s of [...spots].sort((a, b) => rank(a) - rank(b))) {
      const p = placed.get(s.id);
      if (!p || s.id === selectedId) continue; // the docked callout names the selection
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      const w = Math.min(LABEL_MAX, labelWidth(spotName(s, lang)) + 2);
      const g = PIN / 2 + 2;
      const { x, y } = p;
      const options: [LabelSide, Box][] = [
        ['below', { x0: x - w / 2, y0: y + g, x1: x + w / 2, y1: y + g + LABEL_H }],
        ['right', { x0: x + g, y0: y - LABEL_H / 2, x1: x + g + w, y1: y + LABEL_H / 2 }],
        ['left', { x0: x - g - w, y0: y - LABEL_H / 2, x1: x - g, y1: y + LABEL_H / 2 }],
        ['above', { x0: x - w / 2, y0: y - g - LABEL_H, x1: x + w / 2, y1: y - g }],
      ];
      for (const [side, b] of options) {
        if (b.x0 < 2 || b.x1 > width - 2 || b.y0 < 2 || b.y1 > height - 2 || hit(b, s.id === targetId)) continue;
        boxes.push(b);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        out.set(s.id, {
          side,
          width: w,
          latitude: p.latitude + ((p.y - cy) / height) * camera!.latitudeDelta,
          longitude: p.longitude + ((cx - p.x) / width) * camera!.longitudeDelta,
        });
        break;
      }
    }
    return out;
  }, [placed, camera, spots, width, height, targetId, selectedId, collectedIds, lang]);

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
  const viewKey = `${focusKey}|${selectedId}|${collectedIds.size}|${[...labels.keys()].join(',')}|${lang}`;
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
          // iOS keeps an annotation's first frame size: a pin that grows when selected is remounted
          key={`${s.id}:${s.id === selectedId ? 'on' : ''}`}
          coordinate={placed.get(s.id) ?? { latitude: s.latitude, longitude: s.longitude }}
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
          />
        </Marker>
      ))}
      {spots.map((s) => {
        const l = labels.get(s.id);
        if (!l) return null;
        return (
          <Marker
            key={`l:${s.id}`}
            coordinate={{ latitude: l.latitude, longitude: l.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracking}
            zIndex={0}
            onPress={() => onSelect(s)}
          >
            <Text numberOfLines={1} style={[styles.label, { width: l.width }, collectedIds.has(s.id) && styles.labelGot]}>
              {spotName(s, lang)}
            </Text>
          </Marker>
        );
      })}
    </MapView>
  );
}

type LabelSide = 'below' | 'right' | 'left' | 'above';

/** A spot's diorama as a round pin: accent ring while still to collect, white ring and a check once collected. */
function Pin({ spot, got, on, goal }: { spot: Spot; got: boolean; on: boolean; goal: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const d = on ? PIN_ON : PIN;
  const thumb = collectionThumbnail(spot.id);
  return (
    <View style={{ width: d, height: d }}>
      <View
        style={[
          styles.pin,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderColor: got && !on && !goal ? '#FFFFFF' : t.accent,
            borderWidth: on || goal ? 3.5 : 2.5,
          },
        ]}
      >
        {thumb ? (
          <Image source={thumb} style={{ width: d * 1.25, height: d * 1.25 }} />
        ) : (
          <MaterialCommunityIcons name={spot.art.icon as any} size={d * 0.5} color={spot.art.tint} />
        )}
      </View>
      {got && (
        <View style={styles.check}>
          <MaterialCommunityIcons name={'check' as any} size={9} color={t.onAccent} />
        </View>
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
        <View style={[styles.bubble, { borderColor: done ? '#FFFFFF' : t.accent }]}>
          {thumb && <Image source={thumb} style={{ width: BUBBLE * 1.25, height: BUBBLE * 1.25 }} />}
        </View>
        {/* what is still waiting there; a check once the county is complete */}
        <View style={styles.badge}>
          {done ? (
            <MaterialCommunityIcons name={'check' as any} size={11} color={t.onAccent} />
          ) : (
            <Text style={styles.badgeText}>{cluster.total - cluster.found}</Text>
          )}
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
    check: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 15,
      height: 15,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    label: {
      height: LABEL_H,
      textAlign: 'center',
      color: t.text,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.78)' : 'rgba(255,255,255,0.9)',
    },
    labelGot: { color: t.subtext, fontWeight: '600' },
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
