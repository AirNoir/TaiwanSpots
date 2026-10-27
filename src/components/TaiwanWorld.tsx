import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  GestureResponderEvent,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { ATMOSPHERE_OVERLAYS, describeWeather, isWet, Season, seasonOf, skyIcon, Weather } from '../atmosphere';
import { collectionThumbnail, DIORAMA_BG, worldToken } from '../data/spotAssets';
import { distanceMeters, formatDistance, LatLng } from '../geo';
import { countyLabel, labelWidth, metaLabel, spotName, useLang, useT } from '../i18n';
import { Spot, SPOTS } from '../data/spots';
import { makeProjector, TAIWAN, WorldDef, worldAspect } from '../data/world';
import { makeStyles, Palette, seasonTints, useTheme } from '../theme';
import { lightningLoop } from './lightning';
import { useSealedSet } from '../entitlements';
import { PinArt, RealCluster, RealMap } from './RealMap';

// Isometric miniature Taiwan (visual spec v0.2 §10–§11).
// Unvisited land is desaturated and fogged; visited spots bloom colour into
// the terrain, light up, and their landmark token rises out of the map.
// Level 1 shows anchor landmarks for the whole island; tapping a region zooms
// to Level 2 where every spot of that region appears; tapping a spot there
// opens Level 3 (the spot page).

type Pt = { x: number; y: number };
type MarkerKind = 'token' | 'light' | 'thumb' | 'target' | 'cluster';
type Cluster = { county: string; total: number; found: number };
type Marker = { spot: Spot; kind: MarkerKind; size: number; at: Pt; cluster?: Cluster; left?: number };

/** County part of a spot's city label: '台北・信義' → '台北'. */
const countyOf = (s: Spot) => s.city.split('・')[0];
const CLUSTER_MIN = 2; // a county with this many spots in a region folds into one bubble
const CLUSTER = 50;
// Spots per region:county across the whole game (static data).
const COUNTY_SIZE = SPOTS.reduce((m, s) => {
  const k = `${s.region}:${countyOf(s)}`;
  return m.set(k, (m.get(k) ?? 0) + 1);
}, new Map<string, number>());

interface Props {
  width: number;
  collectedIds: Set<string>;
  interactive?: boolean;
  world?: WorldDef;
  /** Recolours discovered terrain; defaults to the current calendar season. */
  season?: Season;
  /** Current weather per region id. Missing or null regions draw no weather. */
  weather?: Record<string, Weather | null>;
  /** After dark: a veil over the map, stars, and brighter landmark lights. */
  night?: boolean;
  /** Traveller position (on-device only): picks the "next stop" and shows distances. */
  location?: LatLng;
  /** The location is a stand-in (no GPS permission): still pick a next stop, but show no distances. */
  approximate?: boolean;
}

const PIN = 34; // thumbnail pin diameter inside a region
const PIN_ON = 46; // selected pin
const LABEL_H = 16;

const TOP_PAD = 0.1; // room above the north tip for token heads (× width)
const SLAB = 0.028; // thickness of the display base (× width)
const BOTTOM_PAD = 0.05;
const MAX_ZOOM = 3.2;
const TOKEN_ASPECT = 1; // world tokens are square, base resting at the bottom edge
const TOKEN_BASE = 0.95; // where the plinth's floor sits in the token image (× height)
const TOKEN_L1 = 0.135; // anchor token width on the island view (× width)
const TOKEN_L2 = 0.17; // token width inside a region (× width)

function smoothClosed(pts: Pt[]) {
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(pts[pts.length - 1], pts[0]);
  let d = `M ${m0.x} ${m0.y}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += ` Q ${p.x} ${p.y} ${m.x} ${m.y}`;
  });
  return d + ' Z';
}

function smoothOpen(pts: Pt[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    d += ` Q ${pts[i].x} ${pts[i].y} ${m.x} ${m.y}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last.x} ${last.y}`;
}

// Deterministic pseudo-random in [0,1) so peaks don't shuffle between renders.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

// Fixed star field (fractions of width / height) so the sky doesn't twinkle on re-render.
const STARS = Array.from({ length: 18 }, (_, k) => [hash(k * 3 + 1), hash(k * 3 + 2) * 0.9, 0.0025 + hash(k * 3 + 3) * 0.003]);

export function worldHeight(width: number, world: WorldDef = TAIWAN) {
  return width * (TOP_PAD + worldAspect(world) + SLAB + BOTTOM_PAD);
}

export function TaiwanWorld({
  width,
  collectedIds,
  interactive = true,
  world = TAIWAN,
  season: seasonProp,
  weather,
  night: nightProp = false,
  location,
  approximate = false,
}: Props) {
  const t = useTheme();
  const tr = useT();
  const lang = useLang();
  // Sealed collections never show their real art on the map: no landmark token, a silhouette pin.
  const sealedSet = useSealedSet();
  const C = t.world;
  const season = seasonProp ?? seasonOf();
  // Night veil and weather drawn over the map are switched off for now (ATMOSPHERE_OVERLAYS);
  // the region's weather is still named in text.
  const night = ATMOSPHERE_OVERLAYS && nightProp;
  const skyFx = ATMOSPHERE_OVERLAYS ? weather : undefined;
  const tint = seasonTints[t.mode][season];
  const styles = useStyles();
  const router = useRouter();
  const height = worldHeight(width, world);
  const [regionId, setRegionIdRaw] = useState<string | null>(null);
  // Level 2.5: one county inside the region, opened from its cluster bubble.
  const [county, setCounty] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Collector's filter: hide what is already collected on the real map and the strip.
  const [todoOnly, setTodoOnly] = useState(false);
  const setRegionId = (id: string | null, select: Spot | null = null) => {
    setRegionIdRaw(id);
    // open the selected spot's county only if that county is folded into a bubble
    const folded = !!select && (COUNTY_SIZE.get(`${select.region}:${countyOf(select)}`) ?? 0) >= CLUSTER_MIN;
    setCounty(folded && select ? countyOf(select) : null);
    setSelectedId(select?.id ?? null);
  };
  // Dev automation: drive the map from the Metro inspector (see docs/radius-navigation-weather.md).
  useEffect(() => {
    if (!__DEV__ || !interactive) return;
    const g = globalThis as any;
    const api = {
      region: (id: string | null) => {
        setRegionIdRaw(id);
        setCounty(null);
        setSelectedId(null);
      },
      county: (c: string | null) => {
        setCounty(c);
        setSelectedId(null);
      },
      select: (id: string | null) => setSelectedId(id),
      todoOnly: (on: boolean) => setTodoOnly(on),
    };
    g.__islandiaMap = api;
    return () => {
      // a remount may already have registered its own api
      if (g.__islandiaMap === api) delete g.__islandiaMap;
    };
  }, [interactive]);
  const inFocus = (s: Spot) => s.region === regionId && (!county || countyOf(s) === county);
  const shown = (s: Spot) => !todoOnly || !collectedIds.has(s.id) || s.id === selectedId;

  const spots = useMemo(() => SPOTS.filter((s) => s.worldId === world.id), [world.id]);

  // The closest spot not yet collected: the map's "next stop" flag.
  const target = useMemo(() => {
    if (!location) return null;
    let best: { spot: Spot; dist: number } | null = null;
    for (const s of spots) {
      if (collectedIds.has(s.id)) continue;
      const dist = distanceMeters(location, s);
      if (!best || dist < best.dist) best = { spot: s, dist };
    }
    return best;
  }, [spots, collectedIds, location]);

  const geo = useMemo(() => {
    const project = makeProjector(world, width, width * TOP_PAD);
    const ll = (p: [number, number]) => project(p[0], p[1]);
    const islands = world.islands.map((i) => {
      const c = ll(i.center);
      const e = ll([i.center[0] + i.rx, i.center[1] - i.ry]);
      return { cx: c.x, cy: c.y, rx: e.x - c.x, ry: e.y - c.y };
    });
    const positions: Record<string, Pt> = {};
    for (const s of spots) {
      positions[s.id] = project(
        s.worldPosition?.lng ?? s.longitude,
        s.worldPosition?.lat ?? s.latitude,
        s.worldPosition?.z ?? 0,
      );
    }
    // Sample low-poly peaks along each ridge spine.
    const step = width * 0.032;
    const peaks: (Pt & { h: number; w: number })[] = [];
    world.ridges.forEach((ridge, ri) => {
      const pts = ridge.map(ll);
      const main = ri === 0 ? 1 : 0.65;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          const seed = ri * 100 + i * 10 + k;
          const along = (i + t) / (pts.length - 1); // 0..1 along the ridge
          peaks.push({
            x: a.x + (b.x - a.x) * t + (hash(seed) - 0.5) * step * 0.6,
            y: a.y + (b.y - a.y) * t + (hash(seed + 7) - 0.5) * step * 0.4,
            h: width * 0.05 * main * (0.6 + Math.sin(along * Math.PI) * 0.5 + hash(seed + 3) * 0.25),
            w: width * 0.034 * main * (0.85 + hash(seed + 11) * 0.3),
          });
        }
      }
    });
    peaks.sort((p, q) => p.y - q.y);
    return {
      island: smoothClosed(world.coastline.map(ll)),
      islands,
      positions,
      peaks,
      // peaks at least this tall get a winter snow cap
      snowLine: Math.max(0, ...peaks.map((p) => p.h)) * 0.7,
      rivers: world.rivers.map((r) => smoothOpen(r.map(ll))),
    };
  }, [world, width, spots]);

  const visited = useMemo(() => spots.filter((s) => collectedIds.has(s.id)), [spots, collectedIds]);
  const bloomR = width * 0.11;

  const regionStats = useMemo(
    () =>
      world.regions.map((r) => {
        const inRegion = spots.filter((s) => s.region === r.id);
        const pts = inRegion.map((s) => geo.positions[s.id]);
        const center = pts.length
          ? {
              x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
              y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
            }
          : { x: width / 2, y: height / 2 };
        return {
          ...r,
          total: inRegion.length,
          found: inRegion.filter((s) => collectedIds.has(s.id)).length,
          center,
        };
      }),
    [world.regions, spots, collectedIds, geo.positions, width, height],
  );

  // ── zoom (Level 1 ↔ Level 2) ──────────────────────────────
  const zoom = useMemo(() => {
    const pts = regionId
      ? spots
          .filter((s) => s.region === regionId && (!county || countyOf(s) === county))
          .map((s) => geo.positions[s.id])
      : [];
    if (!pts.length) return { s: 1, tx: 0, ty: 0 };
    // Fit the spots into the map below the header row (back button / region name),
    // with screen-space margins so pins and their labels never touch the edge.
    const padX = 44;
    const padTop = 84;
    const padBottom = 36;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const s = Math.max(
      1.2,
      Math.min(
        county ? MAX_ZOOM * 4 : MAX_ZOOM,
        (width - 2 * padX) / Math.max(1, maxX - minX),
        (height - padTop - padBottom) / Math.max(1, maxY - minY),
      ),
    );
    const midY = padTop + (height - padTop - padBottom) / 2;
    return {
      s,
      tx: s * (width / 2 - (minX + maxX) / 2),
      ty: midY - height / 2 - s * ((minY + maxY) / 2 - height / 2),
    };
  }, [regionId, county, spots, geo.positions, width, height]);

  const [scale] = useState(() => new Animated.Value(1));
  const [tx] = useState(() => new Animated.Value(0));
  const [ty] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const cfg = { friction: 9, tension: 50, useNativeDriver: true };
    Animated.parallel([
      Animated.spring(scale, { toValue: zoom.s, ...cfg }),
      Animated.spring(tx, { toValue: zoom.tx, ...cfg }),
      Animated.spring(ty, { toValue: zoom.ty, ...cfg }),
    ]).start();
  }, [zoom, scale, tx, ty]);

  // Screen position of a map point under the current (animated) zoom.
  // RN scales about the view centre, then translates.
  const txC = useMemo(() => Animated.add(tx, width / 2), [tx, width]);
  const tyC = useMemo(() => Animated.add(ty, height / 2), [ty, height]);

  // ── ambient motion: drifting fog + breathing lights ───────
  const [drift] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a = loop(drift, 7000);
    const b = loop(pulse, 1800);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [drift, pulse]);

  // rain / snow falls only while some region is wet
  const precip =
    !!skyFx && Object.values(skyFx).some((w) => w && (isWet(w.sky) || w.sky === 'snow'));
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!precip) return;
    const a = Animated.loop(
      Animated.timing(fall, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    a.start();
    return () => a.stop();
  }, [precip, fall]);

  // lightning flashes over any region in a thunderstorm
  const thunder = !!skyFx && Object.values(skyFx).some((w) => w?.sky === 'thunder');
  const [flash] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!thunder) return;
    const a = lightningLoop(flash);
    a.start();
    return () => a.stop();
  }, [thunder, flash]);

  // Spots per county in the open region; the cover is the best-known one there.
  const countyCounts = useMemo(() => {
    const m = new Map<string, { total: number; found: number; x: number; y: number; cover: Spot }>();
    if (!regionId) return m;
    const tierRank = { anchor: 0, regional: 1, local: 2 } as const;
    for (const s of spots) {
      if (s.region !== regionId) continue;
      const c = countyOf(s);
      const p = geo.positions[s.id];
      const e = m.get(c) ?? { total: 0, found: 0, x: 0, y: 0, cover: s };
      e.total += 1;
      e.found += collectedIds.has(s.id) ? 1 : 0;
      e.x += p.x;
      e.y += p.y;
      if (tierRank[s.worldTier] < tierRank[e.cover.worldTier]) e.cover = s;
      m.set(c, e);
    }
    return m;
  }, [spots, regionId, geo.positions, collectedIds]);

  // ── what sits on the map at this level ────────────────────
  // `size` is the on-screen token width; markers are not scaled by the zoom.
  const markers = useMemo<Marker[]>(() => {
    const list: Marker[] = [];
    const lights = new Map<string, { spot: Spot; n: number; left: number; x: number; y: number }>();
    const base = width * (regionId ? TOKEN_L2 : TOKEN_L1);
    for (const s of spots) {
      const at = geo.positions[s.id];
      const got = collectedIds.has(s.id);
      const size = base * (s.tokenScale ?? 1);
      if (regionId) {
        // Inside a region every spot is a picture of itself: the landmark token
        // once it has one, otherwise its diorama thumbnail (faded until collected).
        // Crowded counties fold into one bubble until they are opened.
        if (s.region !== regionId) continue;
        const c = countyOf(s);
        if (county ? c !== county : (countyCounts.get(c)?.total ?? 0) >= CLUSTER_MIN) continue;
        const token = got && !sealedSet.has(s.id) && s.worldTier === 'anchor' && worldToken(s.id);
        list.push({ spot: s, kind: token ? 'token' : 'thumb', size, at });
      } else if (target?.spot.id === s.id) {
        list.push({ spot: s, kind: 'target', size: 0, at });
      } else {
        if (got && !sealedSet.has(s.id) && s.worldTier === 'anchor' && worldToken(s.id)) list.push({ spot: s, kind: 'token', size, at });
        // One mark per county on the island view: a light growing with what was
        // collected there, tagged with how many spots are still waiting.
        const key = `${s.region}:${countyOf(s)}`;
        const l = lights.get(key) ?? { spot: s, n: 0, left: 0, x: 0, y: 0 };
        if (got) l.n += 1;
        else l.left += 1;
        l.x += at.x;
        l.y += at.y;
        lights.set(key, l);
      }
    }
    for (const l of lights.values()) {
      const k = l.n + l.left;
      list.push({
        spot: l.spot,
        kind: 'light',
        size: l.n ? Math.min(1.9, 0.75 + Math.sqrt(l.n) * 0.3) : 0,
        at: { x: l.x / k, y: l.y / k },
        left: l.left,
      });
    }
    // Inside an opened county only its own spots show; the back button returns to the region.
    if (regionId && !county) {
      for (const [c, info] of countyCounts) {
        if (info.total < CLUSTER_MIN) continue;
        list.push({
          spot: info.cover,
          kind: 'cluster',
          size: CLUSTER,
          at: { x: info.x / info.total, y: info.y / info.total },
          cluster: { county: c, total: info.total, found: info.found },
        });
      }
    }
    relax(list, zoom.s, regionId ? 0.4 : 0.3);
    // Back-to-front by depth; pins and the next-stop flag stay on top so they stay tappable.
    const top = (m: Marker) => (m.kind === 'target' ? 2 : m.kind === 'light' ? 1 : 0);
    return list.sort((a, b) => top(a) - top(b) || a.at.y - b.at.y);
  }, [spots, geo.positions, collectedIds, sealedSet, regionId, county, countyCounts, zoom.s, width, target]);

  // Animated screen position per marker, built once per marker list rather than on every render.
  const markerPos = useMemo(
    () =>
      new Map(
        markers.map((m) => [
          m,
          {
            x: Animated.add(Animated.multiply(scale, m.at.x - width / 2), txC),
            y: Animated.add(Animated.multiply(scale, m.at.y - height / 2), tyC),
          },
        ]),
      ),
    [markers, scale, txC, tyC, width, height],
  );

  // Final on-screen position once the zoom has settled.
  const screenPos = (p: Pt) => ({
    x: zoom.s * (p.x - width / 2) + zoom.tx + width / 2,
    y: zoom.s * (p.y - height / 2) + zoom.ty + height / 2,
  });

  // Name labels under region pins, placed greedily by priority and dropped
  // where they would collide, so a crowded city still reads cleanly.
  const labels = useMemo(() => {
    const placed = new Map<string, LabelSide>();
    if (!regionId) return placed;
    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const hit = (b: (typeof boxes)[number]) =>
      boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const pins = markers.map((m) => {
      const p = screenPos(m.at);
      const r = m.kind === 'thumb' ? PIN / 2 : m.kind === 'cluster' ? CLUSTER / 2 + 16 : m.size * 0.35;
      return { m, p, r };
    });
    // pins themselves are obstacles
    for (const { m, p, r } of pins) {
      const h = m.kind === 'token' ? m.size * TOKEN_BASE : r;
      boxes.push({ x0: p.x - r, y0: p.y - (m.kind === 'token' ? h : r), x1: p.x + r, y1: p.y + r });
    }
    const rank = ({ m }: (typeof pins)[number]) =>
      (m.spot.id === selectedId ? 0 : 10) + (m.spot.id === target?.spot.id ? 0 : 5) + (m.spot.worldTier === 'anchor' ? 0 : 2) + (collectedIds.has(m.spot.id) ? 0 : 1);
    for (const pin of [...pins].sort((a, b) => rank(a) - rank(b))) {
      if (pin.m.spot.id === selectedId || pin.m.kind === 'cluster') continue; // the callout / bubble names it
      const w = labelWidth(spotName(pin.m.spot, lang));
      const { x, y } = pin.p;
      const g = pin.r + (pin.m.spot.id === target?.spot.id ? 9 : 3); // clear the pulsing goal ring
      // below first (reads most naturally), then beside, then above
      const options: [LabelSide, { x0: number; y0: number; x1: number; y1: number }][] = [
        ['below', { x0: x - w / 2, y0: y + g - 1, x1: x + w / 2, y1: y + g - 1 + LABEL_H }],
        ['right', { x0: x + g, y0: y - LABEL_H / 2, x1: x + g + w, y1: y + LABEL_H / 2 }],
        ['left', { x0: x - g - w, y0: y - LABEL_H / 2, x1: x - g, y1: y + LABEL_H / 2 }],
        ['above', { x0: x - w / 2, y0: y - g - LABEL_H, x1: x + w / 2, y1: y - g }],
      ];
      for (const [side, b] of options) {
        if (b.x0 < 2 || b.x1 > width - 2 || b.y0 < 2 || b.y1 > height - 2 || hit(b)) continue;
        boxes.push(b);
        placed.set(pin.m.spot.id, side);
        break;
      }
    }
    return placed;
    // screenPos depends only on zoom/width/height
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, regionId, selectedId, target, collectedIds, zoom, width, height, lang]);

  const regionSpots = useMemo(() => {
    if (!regionId) return [];
    return spots
      .filter((s) => inFocus(s) && shown(s))
      .map((s) => ({ spot: s, got: collectedIds.has(s.id), dist: location ? distanceMeters(location, s) : null }))
      // sorted on 100 m steps so a GPS tick doesn't reshuffle the cards under the finger
      .sort(
        (a, b) =>
          Number(a.got) - Number(b.got) ||
          Math.round((a.dist ?? 0) / 100) - Math.round((b.dist ?? 0) / 100) ||
          a.spot.id.localeCompare(b.spot.id),
      )
      .map((i) => (approximate ? { ...i, dist: null } : i));
    // inFocus / shown read regionId, county, todoOnly and selectedId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, regionId, county, collectedIds, location, approximate, todoOnly, selectedId]);

  const onMapPress = (e: GestureResponderEvent) => {
    if (regionId) {
      setSelectedId(null);
      return;
    }
    const { locationX, locationY } = e.nativeEvent;
    const nearest = regionStats.reduce((best, r) =>
      Math.hypot(r.center.x - locationX, r.center.y - locationY) <
      Math.hypot(best.center.x - locationX, best.center.y - locationY)
        ? r
        : best,
    );
    setRegionId(nearest.id);
  };

  const openSpot = (spot: Spot) => router.push(`/spot/${spot.id}`);

  // First tap names a spot, second tap opens it.
  const onMarkerPress = (m: Marker) => {
    const spot = m.spot;
    void Haptics.selectionAsync();
    if (!regionId) {
      setRegionId(spot.region, target?.spot.id === spot.id ? spot : null);
      // a county light opens straight into its county when that county is a bubble
      if (m.kind === 'light' && (COUNTY_SIZE.get(`${spot.region}:${countyOf(spot)}`) ?? 0) >= CLUSTER_MIN)
        setCounty(countyOf(spot));
    }
    else if (m.cluster) {
      setCounty(m.cluster.county);
      setSelectedId(null);
    } else if (selectedId === spot.id) openSpot(spot);
    else setSelectedId(spot.id);
  };

  // Strip cards can point at a spot inside a still-folded county: open that county first.
  const pickFromStrip = (spot: Spot) => {
    if (selectedId === spot.id) return openSpot(spot);
    void Haptics.selectionAsync();
    if (countyOf(spot) !== county && (countyCounts.get(countyOf(spot))?.total ?? 0) >= CLUSTER_MIN) setCounty(countyOf(spot));
    setSelectedId(spot.id);
  };

  const selectedSpot = regionId && selectedId ? spots.find((s) => s.id === selectedId) : undefined;

  // What the real map shows: a county's spots, or a region's bubbles plus its one-spot counties.
  const realSpots = useMemo(
    () =>
      regionId
        ? spots.filter(
            (s) =>
              s.region === regionId &&
              (county ? countyOf(s) === county : (countyCounts.get(countyOf(s))?.total ?? 0) < CLUSTER_MIN) &&
              (!todoOnly || !collectedIds.has(s.id) || s.id === selectedId),
          )
        : [],
    [spots, regionId, county, countyCounts, todoOnly, collectedIds, selectedId],
  );
  const realClusters = useMemo<RealCluster[]>(() => {
    if (!regionId || county) return [];
    const out: RealCluster[] = [];
    for (const [c, info] of countyCounts) {
      if (info.total < CLUSTER_MIN) continue;
      const inCounty = spots.filter((s) => s.region === regionId && countyOf(s) === c);
      out.push({
        county: c,
        cover: info.cover,
        total: info.total,
        found: info.found,
        latitude: inCounty.reduce((a, s) => a + s.latitude, 0) / inCounty.length,
        longitude: inCounty.reduce((a, s) => a + s.longitude, 0) / inCounty.length,
      });
    }
    return out;
  }, [regionId, county, countyCounts, spots]);

  const active = regionStats.find((r) => r.id === regionId);
  const fogShift = drift.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.025, width * 0.025] });
  const fallShift = fall.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.012, width * 0.012] });
  const fallFade = fall.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const veil = splitRgba(C.nightVeil);
  const zoomTransform = { transform: [{ translateX: tx }, { translateY: ty }, { scale }] };

  return (
    <View style={{ width }}>
      <View style={{ width, height, overflow: 'hidden', borderRadius: 18, backgroundColor: night ? C.nightSky : 'transparent' }}>
        {night && (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {STARS.map(([sx, sy, r], k) => (
              <Ellipse key={k} cx={sx * width} cy={sy * height} rx={r * width} ry={r * width} fill={C.star} opacity={0.5 + (k % 3) * 0.2} />
            ))}
          </Svg>
        )}
        <Pressable onPress={onMapPress} disabled={!interactive} style={StyleSheet.absoluteFill}>
          {/* terrain — scaled as one layer */}
          <Animated.View style={[StyleSheet.absoluteFill, zoomTransform]}>
            <Svg width={width} height={height}>
              <Defs>
                <RadialGradient id="sea" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.sea} stopOpacity={0.9} />
                  <Stop offset="100%" stopColor={C.sea} stopOpacity={0} />
                </RadialGradient>
                <LinearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={C.landTop} />
                  <Stop offset="100%" stopColor={C.landBottom} />
                </LinearGradient>
                <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={tint.bloom} stopOpacity={1} />
                  <Stop offset="55%" stopColor={tint.bloom} stopOpacity={0.75} />
                  <Stop offset="100%" stopColor={tint.bloom} stopOpacity={0} />
                </RadialGradient>
                <ClipPath id="islandClip">
                  <Path d={geo.island} />
                </ClipPath>
              </Defs>

              <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#sea)" />

              {/* display base: shadow + slab thickness */}
              <G transform={`translate(0, ${width * SLAB * 1.9})`}>
                <Path d={geo.island} fill={C.baseShadow} />
              </G>
              <G transform={`translate(0, ${width * SLAB})`}>
                <Path d={geo.island} fill={C.slabDark} />
              </G>
              <G transform={`translate(0, ${width * SLAB * 0.5})`}>
                <Path d={geo.island} fill={C.slab} />
              </G>
              {geo.islands.map((i, k) => (
                <G key={k}>
                  <Ellipse cx={i.cx} cy={i.cy + width * SLAB * 0.5} rx={i.rx} ry={i.ry} fill={C.slab} />
                  <Ellipse cx={i.cx} cy={i.cy} rx={i.rx} ry={i.ry} fill="url(#land)" />
                </G>
              ))}

              {/* land surface */}
              <Path d={geo.island} fill="url(#land)" stroke={C.landEdge} strokeWidth={0.8} />

              {/* colour returns where the traveller has been */}
              <G clipPath="url(#islandClip)">
                {visited.map((s) => {
                  const p = geo.positions[s.id];
                  return <Ellipse key={s.id} cx={p.x} cy={p.y} rx={bloomR} ry={bloomR * 0.8} fill="url(#bloom)" />;
                })}
                {/* spring: a few petals scattered around each discovered spot */}
                {tint.blossom &&
                  visited.map((s) => {
                    const p = geo.positions[s.id];
                    const seed = spots.indexOf(s) * 17;
                    return [0, 1, 2, 3, 4].map((k) => {
                      const a = hash(seed + k) * Math.PI * 2;
                      const r = bloomR * (0.3 + hash(seed + k + 5) * 0.55);
                      return (
                        <Ellipse
                          key={`${s.id}p${k}`}
                          cx={p.x + Math.cos(a) * r}
                          cy={p.y + Math.sin(a) * r * 0.8}
                          rx={width * 0.006}
                          ry={width * 0.005}
                          fill={tint.blossom}
                          opacity={0.85}
                        />
                      );
                    });
                  })}
              </G>

              {geo.rivers.map((d, k) => (
                <Path key={k} d={d} stroke={C.river} strokeOpacity={0.55} strokeWidth={1.3} fill="none" strokeLinecap="round" />
              ))}

              {/* mountain ranges — low-poly peaks, green once nearby land is discovered */}
              {geo.peaks.map((p, k) => {
                const lit = visited.some((s) => {
                  const q = geo.positions[s.id];
                  return Math.hypot(q.x - p.x, (q.y - p.y) / 0.8) < bloomR * 1.05;
                });
                const [light, dark] = lit ? tint.ridgeLit : C.ridgeFog;
                const foot = p.y + p.w * 0.28;
                const cap = tint.snowCaps && p.h >= geo.snowLine;
                return (
                  <G key={k}>
                    <Path d={`M ${p.x - p.w} ${p.y} L ${p.x} ${p.y - p.h} L ${p.x} ${foot} Z`} fill={light} stroke={light} strokeWidth={0.8} strokeLinejoin="round" />
                    <Path d={`M ${p.x} ${p.y - p.h} L ${p.x + p.w} ${p.y} L ${p.x} ${foot} Z`} fill={dark} stroke={dark} strokeWidth={0.8} strokeLinejoin="round" />
                    {cap && (
                      <Path
                        d={`M ${p.x - p.w * 0.34} ${p.y - p.h * 0.66} L ${p.x} ${p.y - p.h} L ${p.x + p.w * 0.34} ${p.y - p.h * 0.66} L ${p.x} ${p.y - p.h * 0.56} Z`}
                        fill={C.snow}
                        opacity={0.92}
                      />
                    )}
                  </G>
                );
              })}
            </Svg>
          </Animated.View>

          {/* fog over undiscovered regions, drifting slowly */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, zoomTransform]}>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: fogShift }] }]}>
              <Svg width={width} height={height}>
                <Defs>
                  <RadialGradient id="fog" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={C.fog} stopOpacity={C.fogOpacity} />
                    <Stop offset="100%" stopColor={C.fog} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                {regionStats.map((r) => {
                  const density = r.total ? 1 - r.found / r.total : 1;
                  if (density <= 0.02) return null;
                  // Kept inside the canvas so the gradient never meets a hard clip edge.
                  const rx = width * 0.16;
                  const sway = width * 0.03; // headroom for the fog sway
                  return [-1, 0, 1].map((k) => (
                    <Ellipse
                      key={`${r.id}${k}`}
                      cx={Math.min(width - rx - sway, Math.max(rx + sway, r.center.x + k * width * 0.07))}
                      cy={r.center.y + k * width * 0.03}
                      rx={rx}
                      ry={width * 0.1}
                      fill="url(#fog)"
                      opacity={density * 0.9}
                    />
                  ));
                })}
              </Svg>
            </Animated.View>
          </Animated.View>

          {/* weather over each region: clouds sit still, rain and snow fall */}
          {skyFx && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, zoomTransform]}>
              <Svg width={width} height={height}>
                {regionStats.map((r, ri) => {
                  const w = skyFx[r.id];
                  if (!w || w.sky === 'clear') return null;
                  const n = w.sky === 'cloudy' ? 2 : 3;
                  const op = w.sky === 'cloudy' ? 0.45 : w.sky === 'fog' ? 0.5 : 0.65;
                  const cy = r.center.y - width * 0.06;
                  return (
                    <G key={r.id}>
                      {Array.from({ length: n }).map((_, k) => (
                        <Ellipse
                          key={k}
                          cx={r.center.x + (k - (n - 1) / 2) * width * 0.05 + (hash(ri * 10 + k) - 0.5) * width * 0.02}
                          cy={cy + (hash(ri * 10 + k + 5) - 0.5) * width * 0.02}
                          rx={width * 0.055}
                          ry={width * 0.028}
                          fill={w.sky === 'fog' ? C.fog : C.cloud}
                          opacity={op}
                        />
                      ))}
                    </G>
                  );
                })}
              </Svg>
              {precip && (
                <Animated.View
                  style={[StyleSheet.absoluteFill, { opacity: fallFade, transform: [{ translateY: fallShift }] }]}
                >
                  <Svg width={width} height={height}>
                    {regionStats.map((r, ri) => {
                      const w = skyFx[r.id];
                      if (!w || !(isWet(w.sky) || w.sky === 'snow')) return null;
                      const count = w.sky === 'drizzle' ? 7 : w.sky === 'snow' ? 8 : 12;
                      const len = width * (w.sky === 'drizzle' ? 0.014 : 0.022);
                      return Array.from({ length: count }).map((_, k) => {
                        const x = r.center.x + (hash(ri * 100 + k) - 0.5) * width * 0.16;
                        const y = r.center.y - width * 0.03 + (hash(ri * 100 + k + 50) - 0.5) * width * 0.12;
                        return w.sky === 'snow' ? (
                          <Ellipse key={`${r.id}${k}`} cx={x} cy={y} rx={width * 0.004} ry={width * 0.004} fill={C.snow} opacity={0.9} />
                        ) : (
                          <Path
                            key={`${r.id}${k}`}
                            d={`M ${x} ${y} l ${-len * 0.3} ${len}`}
                            stroke={C.rain}
                            strokeWidth={1.1}
                            strokeLinecap="round"
                            opacity={0.75}
                          />
                        );
                      });
                    })}
                  </Svg>
                </Animated.View>
              )}
              {thunder && (
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: flash }]}>
                  <Svg width={width} height={height}>
                    {regionStats.map((r) => {
                      const w = skyFx[r.id];
                      if (w?.sky !== 'thunder') return null;
                      const bx = r.center.x + width * 0.02;
                      const by = r.center.y - width * 0.05;
                      const bw = width * 0.03;
                      const bh = width * 0.055;
                      return (
                        <G key={r.id}>
                          {/* sheet lightning lights the whole region, then a bolt drops from the cloud */}
                          <Ellipse cx={r.center.x} cy={r.center.y - width * 0.02} rx={width * 0.2} ry={width * 0.14} fill="#FFF7D6" opacity={0.8} />
                          <Path
                            d={`M ${bx} ${by} l ${-bw * 0.5} ${bh * 0.55} l ${bw * 0.35} 0 l ${-bw * 0.4} ${bh * 0.45} l ${bw * 0.95} ${-bh * 0.6} l ${-bw * 0.4} 0 l ${bw * 0.3} ${-bh * 0.4} Z`}
                            fill="#FFD54A"
                            stroke="#FFF3B0"
                            strokeWidth={0.8}
                          />
                        </G>
                      );
                    })}
                  </Svg>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </Pressable>

        {/* inside a county the terrain is magnified far past its detail: fade it to a quiet backdrop */}
        {county && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.card, opacity: 0.62 }]} />}

        {/* night: darken the land itself (not the panel), leaving landmarks and lights above it */}
        {night && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, zoomTransform]}>
            <Svg width={width} height={height}>
              {/* opaque shapes in one group faded once, so the land/slab overlap isn't darkened twice */}
              <G opacity={veil.a}>
                <G transform={`translate(0, ${width * SLAB})`}>
                  <Path d={geo.island} fill={veil.rgb} />
                </G>
                <Path d={geo.island} fill={veil.rgb} />
                {geo.islands.map((i, k) => (
                  <Ellipse key={k} cx={i.cx} cy={i.cy + width * SLAB * 0.25} rx={i.rx} ry={i.ry + width * SLAB * 0.25} fill={veil.rgb} />
                ))}
              </G>
            </Svg>
          </Animated.View>
        )}

        {/* inside a region the real map takes over: streets, districts and place names */}
        {regionId && (
          <View style={StyleSheet.absoluteFill}>
            <RealMap
              width={width}
              height={height}
              spots={realSpots}
              clusters={realClusters}
              collectedIds={collectedIds}
              selectedId={selectedId}
              targetId={target?.spot.id ?? null}
              focusKey={`${regionId}:${county ?? ''}:${todoOnly}`}
              dark={night || t.mode === 'dark'}
              showsUser={!!location && !approximate}
              onSelect={(s) => {
                if (selectedId === s.id) return openSpot(s);
                void Haptics.selectionAsync();
                setSelectedId(s.id);
              }}
              onOpenCounty={(c) => {
                void Haptics.selectionAsync();
                setCounty(c);
                setSelectedId(null);
              }}
              onBackground={() => setSelectedId(null)}
            />
          </View>
        )}

        {/* landmarks, lights and pending pins — repositioned by the zoom, never scaled */}
        {!regionId && markers.map((m) => {
          const pos = markerPos.get(m)!;
          return (
            <Animated.View
              key={`${m.kind}:${m.spot.id}`}
              pointerEvents="box-none"
              style={[styles.anchor, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}
            >
              <Pressable
                disabled={!interactive}
                onPress={() => onMarkerPress(m)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  m.kind === 'light'
                    ? `${countyLabel(countyOf(m.spot), lang)}${m.left ? ` · ${tr('map.leftA11y', { n: m.left })}` : ''}`
                    : m.kind === 'cluster'
                      ? countyLabel(countyOf(m.spot), lang)
                      : spotName(m.spot, lang)
                }
              >
                {m.kind === 'token' ? (
                  <LandmarkToken spot={m.spot} size={m.size} />
                ) : m.kind === 'light' ? (
                  <CountyMark pulse={pulse} night={night} dim={m.size} left={m.left ?? 0} />
                ) : m.kind === 'thumb' ? (
                  <ThumbPin
                    spot={m.spot}
                    got={collectedIds.has(m.spot.id)}
                    sealed={sealedSet.has(m.spot.id)}
                    on={m.spot.id === selectedId}
                    goal={m.spot.id === target?.spot.id}
                    pulse={pulse}
                  />
                ) : m.kind === 'target' ? (
                  <TargetFlag spot={m.spot} dist={approximate ? null : (target?.dist ?? 0)} pulse={pulse} flip={m.at.x > width * 0.55} />
                ) : (
                  m.kind === 'cluster' && m.cluster && <ClusterBubble spot={m.spot} cluster={m.cluster} sealed={sealedSet.has(m.spot.id)} />
                )}
              </Pressable>
              {labels.has(m.spot.id) && (
                <View
                  pointerEvents="none"
                  style={labelStyle(labels.get(m.spot.id)!, m.kind === 'thumb' ? PIN / 2 : m.size * 0.35, m.spot.id === target?.spot.id)}
                >
                  <Text numberOfLines={1} style={[styles.pinLabelText, !collectedIds.has(m.spot.id) && styles.pinLabelFaint]}>
                    {spotName(m.spot, lang)}
                  </Text>
                </View>
              )}
            </Animated.View>
          );
        })}

        {/* docked at the bottom of the real map */}
        {interactive && selectedSpot && (
          <Callout
            spot={selectedSpot}
            at={{ x: width / 2, y: height - 8 }}
            pinR={0}
            width={width}
            height={height}
            got={collectedIds.has(selectedSpot.id)}
            dist={location && !approximate ? distanceMeters(location, selectedSpot) : null}
            onOpen={() => openSpot(selectedSpot)}
          />
        )}

        {interactive && active && (
          <>
            <Pressable
              style={styles.back}
              onPress={() => (county ? (setCounty(null), setSelectedId(null)) : setRegionId(null))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tr('map.back', { place: county ? metaLabel(active, lang) : tr('map.allTaiwan') })}
            >
              <MaterialCommunityIcons name={'chevron-left' as any} size={18} color={t.text} />
              <Text style={styles.backText}>{county ? metaLabel(active, lang) : tr('map.allTaiwan')}</Text>
            </Pressable>
            <Pressable
              style={[styles.todoToggle, todoOnly && styles.todoToggleOn]}
              onPress={() => {
                void Haptics.selectionAsync();
                setTodoOnly((v) => !v);
              }}
              hitSlop={6}
              accessibilityRole="switch"
              accessibilityState={{ checked: todoOnly }}
              accessibilityLabel={tr('map.todoOnly')}
            >
              <MaterialCommunityIcons
                name={(todoOnly ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline') as any}
                size={14}
                color={todoOnly ? t.onAccent : t.accent}
              />
              <Text style={[styles.todoToggleText, todoOnly && { color: t.onAccent }]}>{tr('map.todoOnly')}</Text>
            </Pressable>
            <View style={styles.regionTag} pointerEvents="none">
              <Text style={styles.regionName}>{county ? countyLabel(county, lang) : metaLabel(active, lang)}</Text>
              <Text style={styles.regionCount}>
                {county
                  ? tr('map.collectedOf', { found: countyCounts.get(county)?.found ?? 0, total: countyCounts.get(county)?.total ?? 0 })
                  : tr('map.collectedOf', { found: active.found, total: active.total })}
              </Text>
              {weather?.[active.id] && (
                <Text style={styles.regionWeather}>{describeWeather(weather[active.id] as Weather, lang)}</Text>
              )}
            </View>
          </>
        )}
      </View>

      {interactive && (
        <View style={styles.chips}>
          {regionStats.map((r) => {
            const on = r.id === regionId;
            const w = weather?.[r.id];
            return (
              <Pressable
                key={r.id}
                onPress={() => setRegionId(on ? null : r.id)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tr('map.chipA11y', { region: metaLabel(r, lang), found: r.found, total: r.total })}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {lang === 'zh' ? r.zh.replace('台灣', '') : r.label[0] + r.label.slice(1).toLowerCase()} {r.found}/{r.total}
                </Text>
                {w && (
                  <>
                    <MaterialCommunityIcons name={skyIcon(w) as any} size={12} color={on ? t.accent : t.subtext} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{w.temperature}°</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {interactive && !regionId && (
        <Text style={styles.hint}>{tr(visited.length < spots.length ? 'map.hintLeft' : 'map.hint')}</Text>
      )}

      {interactive && regionId && (
        <SpotStrip
          key={regionId}
          items={regionSpots}
          selectedId={selectedId}
          onPress={pickFromStrip}
          title={county ? countyLabel(county, lang) : active ? metaLabel(active, lang) : ''}
        />
      )}
    </View>
  );
}

type StripItem = { spot: Spot; got: boolean; dist: number | null };

/** Every spot of the open region as a scrollable row of cards; picking one names it on the map. */
function SpotStrip({
  items,
  selectedId,
  onPress,
  title,
}: {
  items: StripItem[];
  selectedId: string | null;
  onPress: (s: Spot) => void;
  title: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  const ref = React.useRef<FlatList<StripItem>>(null);
  const sealedSet = useSealedSet();
  const todo = items.filter((i) => !i.got).length;

  // Scroll to the picked card when the selection changes — not when distances update.
  const itemsRef = React.useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const scrollToSelected = React.useCallback(() => {
    const index = itemsRef.current.findIndex((i) => i.spot.id === selectedId);
    if (index >= 0) ref.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  }, [selectedId]);
  useEffect(() => {
    const frame = requestAnimationFrame(scrollToSelected);
    return () => cancelAnimationFrame(frame);
  }, [scrollToSelected]);

  return (
    <View style={styles.strip}>
      <Text style={styles.stripTitle}>
        {todo ? tr('map.strip.todo', { place: title, n: todo }) : tr('map.strip.done', { place: title })}
      </Text>
      <FlatList
        ref={ref}
        horizontal
        onLayout={scrollToSelected}
        data={items}
        keyExtractor={(i) => i.spot.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
        getItemLayout={(_, index) => ({ length: STRIP_W + 8, offset: (STRIP_W + 8) * index + 4, index })}
        renderItem={({ item }) => {
          const on = item.spot.id === selectedId;
          const thumb = collectionThumbnail(item.spot.id);
          return (
            <Pressable
              onPress={() => onPress(item.spot)}
              style={[styles.stripCard, on && styles.stripCardOn]}
              accessibilityRole="button"
              accessibilityLabel={`${spotName(item.spot, lang)}${item.got ? ` · ${tr('map.got')}` : ''}`}
            >
              <View style={styles.stripThumb}>
                {thumb && sealedSet.has(item.spot.id) ? (
                  <PinArt spotId={item.spot.id} size={STRIP_W - 14} sealed />
                ) : thumb ? (
                  <Image source={thumb} style={{ width: '100%', height: '100%', opacity: item.got ? 1 : 0.55 }} />
                ) : (
                  <MaterialCommunityIcons name={item.spot.art.icon as any} size={26} color={item.spot.art.tint} />
                )}
                {item.got && (
                  <View style={styles.stripCheck}>
                    <MaterialCommunityIcons name={'check' as any} size={10} color={t.onAccent} />
                  </View>
                )}
              </View>
              <Text style={styles.stripName} numberOfLines={1}>
                {spotName(item.spot, lang)}
              </Text>
              <Text style={styles.stripMeta} numberOfLines={1}>
                {item.got ? tr('map.got') : item.dist != null ? formatDistance(item.dist) : item.spot.city}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/** A spot's own diorama in a round frame: faded until collected, ringed when it's the next stop. */
function ThumbPin({
  spot,
  got,
  sealed,
  on,
  goal,
  pulse,
}: {
  spot: Spot;
  got: boolean;
  sealed: boolean;
  on: boolean;
  goal: boolean;
  pulse: Animated.Value;
}) {
  const t = useTheme();
  const styles = useStyles();
  const d = on ? PIN_ON : PIN;
  const thumb = collectionThumbnail(spot.id);
  return (
    <View style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2 }}>
      {goal && (
        <Animated.View
          style={[
            styles.goalRing,
            {
              width: d + 14,
              height: d + 14,
              borderRadius: d,
              left: -7,
              top: -7,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.2] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
            },
          ]}
        />
      )}
      <View
        style={[
          styles.thumbPin,
          { width: d, height: d, borderRadius: d / 2, borderColor: on || goal ? t.accent : got ? '#FFFFFF' : `rgba(${t.world.pin},0.45)` },
        ]}
      >
        {thumb ? (
          <PinArt spotId={spot.id} size={d * 1.25} sealed={sealed} />
        ) : (
          <MaterialCommunityIcons name={spot.art.icon as any} size={d * 0.5} color={spot.art.tint} />
        )}
        {!got && <View style={[StyleSheet.absoluteFill, styles.thumbFog]} />}
      </View>
    </View>
  );
}

/** Level 1: a flag over the closest uncollected spot, so there is always somewhere to go next. */
function TargetFlag({ spot, dist, pulse, flip }: { spot: Spot; dist: number | null; pulse: Animated.Value; flip: boolean }) {
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  return (
    <View style={{ marginLeft: -6, marginTop: -6 }}>
      <Animated.View
        style={[
          styles.targetPulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
          },
        ]}
      />
      <View style={styles.targetDot} />
      <View style={[styles.targetTagBox, flip ? { right: 18, alignItems: 'flex-end' } : { left: 18 }]}>
        <View style={styles.targetTag}>
          <Text style={styles.targetKicker}>{tr('map.nextStop')}</Text>
          <Text style={styles.targetName} numberOfLines={1}>
            {spotName(spot, lang)}
            {dist != null ? ` · ${formatDistance(dist)}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Name card above the selected pin; tapping it opens the spot. */
function Callout({
  spot,
  at,
  pinR,
  width,
  height,
  got,
  dist,
  onOpen,
}: {
  spot: Spot;
  at: Pt;
  pinR: number;
  width: number;
  height: number;
  got: boolean;
  dist: number | null;
  onOpen: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  const sealed = useSealedSet().has(spot.id);
  const [show] = useState(() => new Animated.Value(0));
  useEffect(() => {
    show.setValue(0);
    Animated.spring(show, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [spot.id, show]);
  const W = Math.min(220, width - 16);
  const H = 64;
  const left = Math.max(8, Math.min(width - W - 8, at.x - W / 2));
  // Above the pin when there is room, otherwise below it.
  const above = at.y - pinR - H - 8 > 0;
  const top = above ? at.y - pinR - H - 6 : Math.min(height - H - 4, at.y + PIN_ON / 2 + 6);
  const thumb = collectionThumbnail(spot.id);
  return (
    <Animated.View
      style={[
        styles.callout,
        {
          left,
          top,
          width: W,
          height: H,
          opacity: show,
          transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        },
      ]}
    >
      <Pressable onPress={onOpen} style={styles.calloutInner} accessibilityRole="button" accessibilityLabel={tr('map.view', { name: spotName(spot, lang) })}>
        <View style={styles.calloutThumb}>
          {thumb && <PinArt spotId={spot.id} size={48} sealed={sealed} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.calloutName} numberOfLines={1}>
            {spotName(spot, lang)}
          </Text>
          <Text style={styles.calloutMeta} numberOfLines={1}>
            {spot.city}
            {dist != null ? ` · ${formatDistance(dist)}` : ''}
          </Text>
          <Text style={[styles.calloutState, got && { color: t.accent }]}>{tr(got ? 'map.gotMark' : 'map.notYet')}</Text>
        </View>
        <MaterialCommunityIcons name={'chevron-right' as any} size={20} color={t.subtext} />
      </Pressable>
    </Animated.View>
  );
}

const STRIP_W = 92;

/** A crowded county folded into one bubble: its best-known spot, the county name and progress. */
function ClusterBubble({ spot, cluster, sealed }: { spot: Spot; cluster: Cluster; sealed: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const lang = useLang();
  const thumb = collectionThumbnail(spot.id);
  const done = cluster.found === cluster.total;
  return (
    <View style={{ width: CLUSTER, height: CLUSTER, marginLeft: -CLUSTER / 2, marginTop: -CLUSTER / 2 }}>
      <View style={[styles.cluster, { borderColor: done ? t.accent : '#FFFFFF' }]}>
        {thumb ? (
          <PinArt spotId={spot.id} size={CLUSTER * 1.25} sealed={sealed} />
        ) : (
          <MaterialCommunityIcons name={spot.art.icon as any} size={CLUSTER * 0.5} color={spot.art.tint} />
        )}
      </View>
      <View style={styles.clusterBadge}>
        <Text style={styles.clusterBadgeText}>{cluster.total}</Text>
      </View>
      <View style={styles.clusterLabelBox} pointerEvents="none">
        <Text style={styles.clusterLabel} numberOfLines={1}>
          {countyLabel(cluster.county, lang)} <Text style={styles.clusterProgress}>{cluster.found}/{cluster.total}</Text>
        </Text>
      </View>
    </View>
  );
}

type LabelSide = 'below' | 'right' | 'left' | 'above';
const LABEL_BOX = 140;

/** Positions a name label on one side of a pin of radius r (relative to the pin centre). */
function labelStyle(side: LabelSide, r: number, goal = false) {
  const g = r + (goal ? 9 : 3);
  const base = { position: 'absolute' as const, width: LABEL_BOX };
  switch (side) {
    case 'below':
      return { ...base, left: -LABEL_BOX / 2, top: g - 1, alignItems: 'center' as const };
    case 'above':
      return { ...base, left: -LABEL_BOX / 2, top: -g - LABEL_H, alignItems: 'center' as const };
    case 'right':
      return { ...base, left: g, top: -LABEL_H / 2, alignItems: 'flex-start' as const };
    case 'left':
      return { ...base, left: -g - LABEL_BOX, top: -LABEL_H / 2, alignItems: 'flex-end' as const };
  }
}

/** 'rgba(14,22,52,0.5)' → { rgb: 'rgb(14,22,52)', a: 0.5 } */
function splitRgba(c: string) {
  const m = c.match(/rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)/);
  if (!m) return { rgb: c, a: 1 };
  return { rgb: `rgb(${m[1]},${m[2]},${m[3]})`, a: m[4] == null ? 1 : Number(m[4]) };
}

// Pushes overlapping markers apart (in zoomed screen space) so dense areas
// like Taipei stay legible. Replaces each marker's `at` with its displaced
// map position.
function relax(list: Marker[], s: number, spread: number) {
  const pts = list.map((m) => ({ x: m.at.x * s, y: m.at.y * s }));
  const radius = (m: Marker) =>
    m.kind === 'thumb' ? PIN / 2 + 1 : m.kind === 'cluster' ? CLUSTER : m.kind === 'target' ? 12 : m.kind === 'light' ? Math.max(9, 6 * m.size) : m.size * spread;
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const minD = radius(list[i]) + radius(list[j]);
        const dx = pts[j].x - pts[i].x;
        const dy = (pts[j].y - pts[i].y) * 1.4; // tokens are wider than tall
        const d = Math.hypot(dx, dy);
        if (d >= minD) continue;
        const ux = d ? dx / d : 1;
        const uy = d ? dy / d : 0;
        const push = (minD - d) / 2;
        pts[i].x -= ux * push;
        pts[i].y -= (uy * push) / 1.4;
        pts[j].x += ux * push;
        pts[j].y += (uy * push) / 1.4;
        moved = true;
      }
    }
    if (!moved) break;
  }
  list.forEach((m, i) => {
    m.at = { x: pts[i].x / s, y: pts[i].y / s };
  });
}

function LandmarkToken({ spot, size }: { spot: Spot; size: number }) {
  const styles = useStyles();
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      friction: 6,
      tension: 70,
      delay: 80 + Math.random() * 260,
      useNativeDriver: true,
    }).start();
  }, [rise]);

  const source = worldToken(spot.id);
  const h = size * TOKEN_ASPECT;
  // Anchored at the bottom-centre of the token base, which sits on the spot.
  return (
    <View style={{ width: size, height: h, marginLeft: -size / 2, marginTop: -h * TOKEN_BASE }}>
      <View
        style={[
          styles.tokenShadow,
          { width: size * 0.7, height: size * 0.12, left: size * 0.15, top: h * TOKEN_BASE - size * 0.07, borderRadius: size },
        ]}
      />
      <Animated.View
        style={{
          flex: 1,
          opacity: rise,
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [h * 0.35, 0] }) },
            { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        }}
      >
        {source ? (
          <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <View style={styles.tokenFallback}>
            <MaterialCommunityIcons name={spot.art.icon as any} size={size * 0.5} color={spot.art.tint} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function Light({ pulse, night, dim }: { pulse: Animated.Value; night: boolean; dim: number }) {
  const styles = useStyles();
  return (
    <View style={[styles.lightWrap, { transform: [{ scale: dim }] }]}>
      <Animated.View
        style={[
          styles.lightHalo,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: night ? [0.45, 0.8] : [0.25, 0.6] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: night ? [0.95, 1.4] : [0.8, 1.25] }) }],
          },
        ]}
      />
      <View style={styles.lightCore} />
    </View>
  );
}

/** A county on the island view: its light (if anything was collected there) and how many spots remain. */
function CountyMark({ pulse, night, dim, left }: { pulse: Animated.Value; night: boolean; dim: number; left: number }) {
  const styles = useStyles();
  return (
    <View>
      {dim ? <Light pulse={pulse} night={night} dim={dim} /> : <View style={styles.unexplored} />}
      {left > 0 && (
        <View pointerEvents="none" style={[styles.leftTag, { left: dim ? 3 + dim * 3 : 4 }]}>
          <Text style={styles.leftTagText}>{left}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  anchor: { position: 'absolute', left: 0, top: 0 },
  tokenShadow: { position: 'absolute', backgroundColor: t.world.tokenShadow },
  tokenFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(242,237,226,0.9)',
  },
  lightWrap: {
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightHalo: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: t.world.light },
  lightCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.world.lightCore },
  unexplored: {
    width: 9,
    height: 9,
    marginLeft: -4.5,
    marginTop: -4.5,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: `rgba(${t.world.pin},0.7)`,
    backgroundColor: `rgba(${t.world.pin},0.18)`,
  },
  leftTag: {
    position: 'absolute',
    top: -17,
    minWidth: 16,
    height: 15,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.accent,
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.92)',
  },
  leftTagText: { color: t.accent, fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
  back: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingRight: 10,
    paddingLeft: 4,
    borderRadius: 14,
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.85)',
  },
  backText: { color: t.text, fontSize: 12, fontWeight: '600' },
  todoToggle: {
    position: 'absolute',
    left: 8,
    top: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.accent,
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.85)',
  },
  todoToggleOn: { backgroundColor: t.accent },
  todoToggleText: { color: t.accent, fontSize: 12, fontWeight: '700' },
  regionTag: {
    position: 'absolute',
    right: 8,
    top: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.85)',
  },
  regionName: { color: t.text, fontSize: 15, fontWeight: '800' },
  regionCount: { color: t.accent, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  regionWeather: { color: t.subtext, fontSize: 11, marginTop: 2 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  chipOn: { backgroundColor: t.accentSoft, borderColor: t.accent },
  chipText: { color: t.subtext, fontSize: 11, fontWeight: '600' },
  chipTextOn: { color: t.accent },
  cluster: {
    width: CLUSTER,
    height: CLUSTER,
    borderRadius: CLUSTER / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DIORAMA_BG,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  clusterBadge: {
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
  clusterBadgeText: { color: t.onAccent, fontSize: 10, fontWeight: '800' },
  clusterLabelBox: { position: 'absolute', top: CLUSTER + 3, left: -40, width: CLUSTER + 80, alignItems: 'center' },
  clusterLabel: {
    color: t.text,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.78)' : 'rgba(255,255,255,0.9)',
  },
  clusterProgress: { color: t.accent, fontSize: 11, fontWeight: '700' },
  hint: { color: t.faint, fontSize: 11, textAlign: 'center', marginTop: 8 },
  pinLabelText: {
    color: t.text,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: t.mode === 'dark' ? 'rgba(11,18,32,0.72)' : 'rgba(255,255,255,0.82)',
  },
  pinLabelFaint: { color: t.subtext, fontWeight: '600' },
  thumbPin: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: DIORAMA_BG,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbFog: { backgroundColor: t.mode === 'dark' ? 'rgba(20,28,44,0.5)' : 'rgba(242,237,226,0.55)' },
  goalRing: { position: 'absolute', borderWidth: 2, borderColor: t.accent },
  targetPulse: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: t.accent },
  targetDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.accent, borderWidth: 2, borderColor: '#FFFFFF' },
  targetTagBox: { position: 'absolute', top: -12, width: 170, alignItems: 'flex-start' },
  targetTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: t.accent,
    maxWidth: 170,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  targetKicker: { color: t.onAccent, fontSize: 8, fontWeight: '800', letterSpacing: 1.5, opacity: 0.85 },
  targetName: { color: t.onAccent, fontSize: 11, fontWeight: '700' },
  callout: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  calloutInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  calloutThumb: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: DIORAMA_BG },
  calloutName: { color: t.text, fontSize: 14, fontWeight: '800' },
  calloutMeta: { color: t.subtext, fontSize: 11, marginTop: 1 },
  calloutState: { color: t.faint, fontSize: 10, fontWeight: '700', marginTop: 2 },
  strip: { alignSelf: 'stretch', marginTop: 12 },
  stripTitle: { color: t.subtext, fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  stripCard: {
    width: STRIP_W,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: t.bg,
  },
  stripCardOn: { borderColor: t.accent, backgroundColor: t.accentSoft },
  stripThumb: {
    width: STRIP_W - 14,
    height: STRIP_W - 14,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DIORAMA_BG,
  },
  stripCheck: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  stripName: { color: t.text, fontSize: 12, fontWeight: '700', marginTop: 6 },
  stripMeta: { color: t.subtext, fontSize: 10, marginTop: 1 },
  }),
);
