import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
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
import { describeWeather, isWet, Season, seasonOf, skyIcon, Weather } from '../atmosphere';
import { worldToken } from '../data/spotAssets';
import { Spot, SPOTS } from '../data/spots';
import { makeProjector, TAIWAN, WorldDef, worldAspect } from '../data/world';
import { makeStyles, Palette, seasonTints, useTheme } from '../theme';
import { lightningLoop } from './lightning';

// Isometric miniature Taiwan (visual spec v0.2 §10–§11).
// Unvisited land is desaturated and fogged; visited spots bloom colour into
// the terrain, light up, and their landmark token rises out of the map.
// Level 1 shows anchor landmarks for the whole island; tapping a region zooms
// to Level 2 where every spot of that region appears; tapping a spot there
// opens Level 3 (the spot page).

type Pt = { x: number; y: number };
type MarkerKind = 'token' | 'light' | 'pending';
type Marker = { spot: Spot; kind: MarkerKind; size: number; at: Pt };

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
}

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
  night = false,
}: Props) {
  const t = useTheme();
  const C = t.world;
  const season = seasonProp ?? seasonOf();
  const tint = seasonTints[t.mode][season];
  const styles = useStyles();
  const router = useRouter();
  const height = worldHeight(width, world);
  const [regionId, setRegionId] = useState<string | null>(null);

  const spots = useMemo(() => SPOTS.filter((s) => s.worldId === world.id), [world.id]);

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
      ? spots.filter((s) => s.region === regionId).map((s) => geo.positions[s.id])
      : [];
    if (!pts.length) return { s: 1, tx: 0, ty: 0 };
    const pad = width * 0.09;
    const tokenH = width * TOKEN_L2 * TOKEN_ASPECT; // on-screen, unaffected by zoom
    const minX = Math.min(...pts.map((p) => p.x)) - pad;
    const maxX = Math.max(...pts.map((p) => p.x)) + pad;
    const minY = Math.min(...pts.map((p) => p.y)) - pad;
    const maxY = Math.max(...pts.map((p) => p.y)) + pad;
    const s = Math.max(
      1.2,
      Math.min(MAX_ZOOM, width / (maxX - minX), (height - tokenH) / (maxY - minY)),
    );
    // Centre the spots, then drop them by half a token so the risen landmarks are centred.
    return {
      s,
      tx: s * (width / 2 - (minX + maxX) / 2),
      ty: s * (height / 2 - (minY + maxY) / 2) + tokenH * 0.45,
    };
  }, [regionId, spots, geo.positions, width, height]);

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
  const animatedPos = (p: Pt) => ({
    x: Animated.add(Animated.multiply(scale, p.x - width / 2), Animated.add(tx, width / 2)),
    y: Animated.add(Animated.multiply(scale, p.y - height / 2), Animated.add(ty, height / 2)),
  });

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
    !!weather && Object.values(weather).some((w) => w && (isWet(w.sky) || w.sky === 'snow'));
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
  const thunder = !!weather && Object.values(weather).some((w) => w?.sky === 'thunder');
  const [flash] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!thunder) return;
    const a = lightningLoop(flash);
    a.start();
    return () => a.stop();
  }, [thunder, flash]);

  // ── what sits on the map at this level ────────────────────
  // `size` is the on-screen token width; markers are not scaled by the zoom.
  const markers = useMemo<Marker[]>(() => {
    const list: Marker[] = [];
    const base = width * (regionId ? TOKEN_L2 : TOKEN_L1);
    for (const s of spots) {
      const at = geo.positions[s.id];
      const got = collectedIds.has(s.id);
      const size = base * (s.tokenScale ?? 1);
      if (regionId) {
        if (s.region === regionId) list.push({ spot: s, kind: got ? 'token' : 'pending', size, at });
      } else if (got) {
        list.push({ spot: s, kind: s.worldTier === 'anchor' ? 'token' : 'light', size, at });
      } else if (s.worldTier === 'anchor') {
        list.push({ spot: s, kind: 'pending', size: 0, at });
      }
    }
    relax(list, zoom.s, regionId ? 0.4 : 0.3);
    // Back-to-front by depth; pending pins always on top so they stay tappable.
    return list.sort((a, b) => Number(a.kind === 'pending') - Number(b.kind === 'pending') || a.at.y - b.at.y);
  }, [spots, geo.positions, collectedIds, regionId, zoom.s, width]);

  const onMapPress = (e: GestureResponderEvent) => {
    if (regionId) return;
    const { locationX, locationY } = e.nativeEvent;
    const nearest = regionStats.reduce((best, r) =>
      Math.hypot(r.center.x - locationX, r.center.y - locationY) <
      Math.hypot(best.center.x - locationX, best.center.y - locationY)
        ? r
        : best,
    );
    setRegionId(nearest.id);
  };

  const onMarkerPress = (spot: Spot) => {
    if (regionId) router.push(`/spot/${spot.id}`);
    else setRegionId(spot.region);
  };

  const active = regionStats.find((r) => r.id === regionId);
  // A near-complete collection puts a light on almost every spot; shrink the halos so terrain stays visible.
  const lightCount = markers.filter((m) => m.kind === 'light').length;
  const lightDim = lightCount > 80 ? 0.55 : lightCount > 40 ? 0.75 : 1;
  const fogShift = drift.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.025, width * 0.025] });
  const fallShift = fall.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.012, width * 0.012] });
  const fallFade = fall.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const zoomTransform = { transform: [{ translateX: tx }, { translateY: ty }, { scale }] };

  return (
    <View style={{ width }}>
      <View style={{ width, height, overflow: 'hidden' }}>
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
          {weather && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, zoomTransform]}>
              <Svg width={width} height={height}>
                {regionStats.map((r, ri) => {
                  const w = weather[r.id];
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
                      const w = weather[r.id];
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
                      const w = weather[r.id];
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

        {/* night: veil the terrain and weather, leave the landmarks and their lights above it */}
        {night && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.nightVeil }]}>
            <Svg width={width} height={height}>
              {STARS.map(([sx, sy, r], k) => (
                <Ellipse key={k} cx={sx * width} cy={sy * height} rx={r * width} ry={r * width} fill={C.star} opacity={0.8} />
              ))}
            </Svg>
          </View>
        )}

        {/* landmarks, lights and pending pins — repositioned by the zoom, never scaled */}
        {markers.map((m) => {
          const pos = animatedPos(m.at);
          return (
            <Animated.View
              key={m.spot.id}
              pointerEvents="box-none"
              style={[styles.anchor, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}
            >
              <Pressable
                disabled={!interactive}
                onPress={() => onMarkerPress(m.spot)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={m.spot.name}
              >
                {m.kind === 'token' ? (
                  <LandmarkToken spot={m.spot} size={m.size} />
                ) : m.kind === 'light' ? (
                  <Light pulse={pulse} night={night} dim={lightDim} />
                ) : (
                  <PendingPin big={!!regionId} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {interactive && active && (
          <>
            <Pressable style={styles.back} onPress={() => setRegionId(null)} hitSlop={8}>
              <MaterialCommunityIcons name={'chevron-left' as any} size={18} color={t.text} />
              <Text style={styles.backText}>{world.name}</Text>
            </Pressable>
            <View style={styles.regionTag} pointerEvents="none">
              <Text style={styles.regionName}>{active.zh}</Text>
              <Text style={styles.regionCount}>
                {active.found} / {active.total} discovered
              </Text>
              {weather?.[active.id] && (
                <Text style={styles.regionWeather}>{describeWeather(weather[active.id] as Weather)}</Text>
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
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {r.zh.replace('台灣', '')} {r.found}/{r.total}
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
    </View>
  );
}

// Pushes overlapping markers apart (in zoomed screen space) so dense areas
// like Taipei stay legible. Replaces each marker's `at` with its displaced
// map position.
function relax(list: Marker[], s: number, spread: number) {
  const pts = list.map((m) => ({ x: m.at.x * s, y: m.at.y * s }));
  const radius = (m: Marker) => (m.kind === 'pending' ? 16 : m.kind === 'light' ? 6 : m.size * spread);
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

function PendingPin({ big }: { big: boolean }) {
  const { pin } = useTheme().world;
  const d = big ? 14 : 5;
  return (
    <View
      style={{
        width: d,
        height: d,
        marginLeft: -d / 2,
        marginTop: -d / 2,
        borderRadius: d,
        borderWidth: big ? 1.5 : 0,
        borderColor: `rgba(${pin},0.55)`,
        backgroundColor: big ? `rgba(${pin},0.12)` : `rgba(${pin},0.35)`,
      }}
    />
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
  regionTag: { position: 'absolute', right: 10, top: 8, alignItems: 'flex-end' },
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
  }),
);
