import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Islandia promo v1 — 20 s vertical (1080×1920 @ 30 fps).
// Story: a sealed silhouette → walk to it on the map → unlock → the island fills up
// → passport and share card → end card. Palette mirrors the app's light theme (src/theme.ts).

export const PROMO_FRAMES = 600;

const C = {
  bg: '#F6F1E7',
  card: '#FFFFFF',
  ink: '#1E2531',
  sub: '#5F6877',
  accent: '#B8711A',
  sealedBg: '#EDE5D5',
  sealedInk: '#C7B89C',
  landTop: '#D3D6CD',
  landBottom: '#C3C7BC',
  landEdge: '#A9AFA4',
  slab: '#CDB896',
  slabDark: '#B39C78',
  sea: '#BFD8EA',
  bloom: '#8DC56A',
  ridge: '#B6BAB2',
  river: '#7FB2D9',
};
const FONT = '"PingFang TC", "Noto Sans TC", "Heiti TC", sans-serif';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

// ---------------------------------------------------------------- world -----

const W = 1000; // world width in px; height follows the app's tilted projection
const GROUND_H = 1160;
const proj = (lng: number, lat: number) => ({
  x: ((lng - 119.95) / 2.1) * W,
  y: ((25.4 - lat) / 3.6) * GROUND_H,
});

const COAST: [number, number][] = [
  [121.54, 25.3], [121.7, 25.19], [121.8, 25.14], [121.93, 25.02], [121.86, 24.88],
  [121.83, 24.7], [121.86, 24.57], [121.75, 24.38], [121.7, 24.25], [121.63, 24.03],
  [121.53, 23.7], [121.45, 23.35], [121.42, 23.12], [121.18, 22.8], [120.98, 22.55],
  [120.9, 22.3], [120.86, 22.05], [120.85, 21.9], [120.73, 21.93], [120.7, 22.08],
  [120.62, 22.3], [120.45, 22.48], [120.27, 22.6], [120.2, 22.75], [120.14, 22.98],
  [120.09, 23.12], [120.08, 23.35], [120.15, 23.7], [120.24, 23.9], [120.38, 24.05],
  [120.53, 24.3], [120.62, 24.47], [120.72, 24.66], [120.87, 24.83], [121.0, 24.99],
  [121.15, 25.08], [121.4, 25.18], [121.5, 25.28],
];
const RIDGES: [number, number][][] = [
  [[121.55, 24.75], [121.38, 24.4], [121.25, 24.1], [121.1, 23.7], [120.98, 23.3], [120.88, 22.9], [120.8, 22.45]],
  [[121.62, 24.92], [121.42, 24.62], [121.23, 24.38]],
  [[120.98, 23.75], [120.88, 23.45], [120.78, 23.15]],
  [[121.55, 23.85], [121.42, 23.4], [121.28, 23.0]],
];
const RIVERS: [number, number][][] = [
  [[121.55, 24.95], [121.48, 25.05], [121.41, 25.17]],
  [[121.0, 23.85], [120.6, 23.85], [120.23, 23.83]],
  [[120.62, 23.05], [120.5, 22.75], [120.43, 22.48]],
];

// Smooth path through points (Catmull-Rom → cubic Bézier).
const smoothPath = (pts: { x: number; y: number }[], closed: boolean) => {
  const n = pts.length;
  const at = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
};
const COAST_D = smoothPath(COAST.map(([a, b]) => proj(a, b)), true);

type Spot = { id: string; name: string; lng: number; lat: number };
const SPOTS: Spot[] = [
  { id: 'jiufen', name: '九份老街', lng: 121.8443, lat: 25.1089 },
  { id: 'taipei-101', name: '台北 101', lng: 121.5645, lat: 25.0339 },
  { id: 'yehliu', name: '野柳', lng: 121.6897, lat: 25.206 },
  { id: 'tamsui', name: '淡水老街', lng: 121.4406, lat: 25.1677 },
  { id: 'taroko', name: '太魯閣', lng: 121.622, lat: 24.158 },
  { id: 'gaomei', name: '高美濕地', lng: 120.549, lat: 24.3123 },
  { id: 'sun-moon-lake', name: '日月潭', lng: 120.915, lat: 23.862 },
  { id: 'lukang', name: '鹿港老街', lng: 120.4324, lat: 24.0566 },
  { id: 'alishan', name: '阿里山', lng: 120.803, lat: 23.51 },
  { id: 'chihkan', name: '赤崁樓', lng: 120.2025, lat: 22.9975 },
  { id: 'pier2', name: '駁二', lng: 120.2816, lat: 22.6202 },
  { id: 'kenting', name: '墾丁', lng: 120.779, lat: 21.948 },
];
const JIUFEN = proj(121.8443, 25.1089);
// The walk is exaggerated so it reads at phone size: from inland SW up to Jiufen.
const WALK_FROM = { x: JIUFEN.x - 120, y: JIUFEN.y + 92 };
const WALK_CTRL = { x: JIUFEN.x - 18, y: JIUFEN.y + 112 };
const WALK_TO = { x: JIUFEN.x, y: JIUFEN.y + 10 };
const walkAt = (t: number) => ({
  x: (1 - t) ** 2 * WALK_FROM.x + 2 * (1 - t) * t * WALK_CTRL.x + t * t * WALK_TO.x,
  y: (1 - t) ** 2 * WALK_FROM.y + 2 * (1 - t) * t * WALK_CTRL.y + t * t * WALK_TO.y,
});
const WALK_D = `M${WALK_FROM.x},${WALK_FROM.y} Q${WALK_CTRL.x},${WALK_CTRL.y} ${WALK_TO.x},${WALK_TO.y}`;

// --------------------------------------------------------------- timing -----

const T = {
  hookEnd: 80,
  mapIn: 66,
  walkStart: 104,
  walkEnd: 184,
  unlock: 196, // overlay starts
  unlockEnd: 300,
  zoomOut: 300,
  popStart: 322,
  mapOut: 440,
  phones: 428,
  end: 522,
};

// --------------------------------------------------------------- pieces -----

const Caption: React.FC<{ text: string; from: number; to: number; accent?: string; kicker?: string }> = ({
  text,
  from,
  to,
  accent,
  kicker,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from - 2 || frame > to + 2) return null;
  const out = interpolate(frame, [to - 8, to], [1, 0], clamp);
  const chars = [...text];
  const hotAt = accent ? [...text.slice(0, Math.max(0, text.indexOf(accent)))].length : -1;
  const hotLen = accent ? [...accent].length : 0;
  return (
    <div style={{ position: 'absolute', top: 210, left: 60, right: 60, textAlign: 'center', fontFamily: FONT, opacity: out }}>
      {kicker ? (
        <div
          style={{
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 8,
            color: C.accent,
            marginBottom: 18,
            opacity: interpolate(frame, [from, from + 10], [0, 1], clamp),
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{ fontSize: 92, fontWeight: 800, color: C.ink, lineHeight: 1.15, letterSpacing: 2 }}>
        {chars.map((ch, i) => {
          const s = spring({ frame: frame - from - i * 2, fps, config: { damping: 14, stiffness: 160 } });
          const hot = hotAt >= 0 && i >= hotAt && i < hotAt + hotLen;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - s) * 50}px)`,
                opacity: s,
                color: hot ? C.accent : C.ink,
                minWidth: ch === ' ' ? 24 : undefined,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Phone: React.FC<{ src: string; width: number; style?: React.CSSProperties }> = ({ src, width, style }) => {
  const h = (width * 2622) / 1206;
  const bezel = width * 0.035;
  return (
    <div
      style={{
        position: 'absolute',
        width: width + bezel * 2,
        height: h + bezel * 2,
        borderRadius: width * 0.16,
        background: '#15181E',
        padding: bezel,
        boxShadow: '0 50px 90px rgba(80,64,36,0.28), 0 10px 24px rgba(80,64,36,0.18)',
        ...style,
      }}
    >
      <Img src={staticFile(src)} style={{ width, height: h, borderRadius: width * 0.13, display: 'block' }} />
    </div>
  );
};

// ------------------------------------------------------------- scene 1 ------

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 120 } });
  const outT = interpolate(frame, [T.hookEnd - 16, T.hookEnd], [0, 1], { ...clamp, easing: ease });
  const wob = Math.sin(frame / 5) * 3 * (1 - outT);
  const bob = Math.sin(frame / 9) * 10;
  const marks = [
    { x: 150, y: 760, s: 90, d: 0 },
    { x: 920, y: 880, s: 120, d: 8 },
    { x: 170, y: 1400, s: 70, d: 14 },
    { x: 900, y: 1480, s: 84, d: 20 },
  ];
  return (
    <AbsoluteFill style={{ opacity: 1 - outT }}>
      {marks.map((m, i) => {
        const s = spring({ frame: frame - 10 - m.d, fps, config: { damping: 10 } });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: m.x - m.s / 2,
              top: m.y - m.s / 2 + Math.sin((frame + i * 20) / 8) * 14,
              fontFamily: FONT,
              fontSize: m.s,
              fontWeight: 900,
              color: C.sealedInk,
              opacity: s * 0.8,
              transform: `scale(${s}) rotate(${(i % 2 ? 1 : -1) * 12}deg)`,
            }}
          >
            ?
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 540 - 380,
          top: 620 + bob,
          width: 760,
          height: 760,
          borderRadius: 72,
          background: C.sealedBg,
          boxShadow: '0 40px 80px rgba(80,64,36,0.16)',
          transform: `scale(${inS * (1 - outT * 0.5)}) rotate(${wob}deg) translateY(${-outT * 120}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img src={staticFile('sil/jiufen.png')} style={{ width: 600, height: 600 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1440 + bob * 0.5,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 120,
          letterSpacing: 24,
          color: C.sealedInk,
          opacity: interpolate(frame, [12, 24], [0, 1], clamp) * (1 - outT),
        }}
      >
        ？？？
      </div>
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------- map --------

type Cam = { x: number; y: number; z: number };
const CAM_FULL: Cam = { x: 483, y: 600, z: 0.92 };
const CAM_NORTH: Cam = { x: JIUFEN.x - 55, y: JIUFEN.y + 55, z: 3.3 };

const camAt = (f: number): Cam => {
  const a = interpolate(f, [T.mapIn, T.walkStart], [0, 1], { ...clamp, easing: ease }); // full → north
  const b = interpolate(f, [T.zoomOut, T.zoomOut + 34], [0, 1], { ...clamp, easing: ease }); // north → full
  const k = a * (1 - b);
  // zoom in log space so the move feels even
  const z = Math.exp(Math.log(CAM_FULL.z) + (Math.log(CAM_NORTH.z) - Math.log(CAM_FULL.z)) * k);
  return { x: CAM_FULL.x + (CAM_NORTH.x - CAM_FULL.x) * k, y: CAM_FULL.y + (CAM_NORTH.y - CAM_FULL.y) * k, z };
};

const SCREEN_CY = 1080;

const Token: React.FC<{ spot: Spot; frame: number; reveal: number; size: number }> = ({ spot, frame, reveal, size }) => {
  const { fps } = useVideoConfig();
  const p = proj(spot.lng, spot.lat);
  const open = reveal >= 0 && frame >= reveal;
  const pop = open ? spring({ frame: frame - reveal, fps, config: { damping: 9, stiffness: 140 } }) : 0;
  const colour = open ? interpolate(frame, [reveal, reveal + 6], [0, 1], clamp) : 0;
  const lift = pop * size * 0.12;
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x - size / 2,
        top: p.y - size * 0.82 - lift,
        width: size,
        height: size,
        transform: `scale(${0.82 + pop * 0.18})`,
        transformOrigin: '50% 85%',
      }}
    >
      <Img src={staticFile(`sil/${spot.id}.png`)} style={{ position: 'absolute', width: size, height: size, opacity: (1 - colour) * 0.9 }} />
      <Img src={staticFile(`lm/${spot.id}.png`)} style={{ position: 'absolute', width: size, height: size, opacity: colour }} />
    </div>
  );
};

// Jiufen unlocks when the overlay reveals it; the rest pop in during the zoom-out.
const revealOf = (i: number) => (i === 0 ? T.unlock + 36 : T.popStart + (i - 1) * 8);

const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = camAt(frame);
  const tx = 540 - cam.x * cam.z;
  const ty = SCREEN_CY - cam.y * cam.z;
  const vis = interpolate(frame, [T.mapIn, T.mapIn + 14, T.mapOut - 14, T.mapOut], [0, 1, 1, 0], clamp);
  if (vis <= 0) return null;

  const walk = interpolate(frame, [T.walkStart, T.walkEnd], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const me = walkAt(walk);
  const arrived = frame >= T.walkEnd;
  const meters = Math.round((1 - walk) * 1280);
  const collected = SPOTS.filter((_, i) => frame >= revealOf(i)).length;

  const dotR = 20 / cam.z;
  const tokBase = 112 / Math.pow(cam.z, 0.6); // big on the full island, sane when zoomed
  const pulse = (frame % 30) / 30;
  const pillIn = spring({ frame: frame - T.walkStart + 6, fps, config: { damping: 12 } });
  const pillBump = arrived ? 1 + 0.08 * Math.sin((frame - T.walkEnd) / 2) * interpolate(frame, [T.walkEnd, T.walkEnd + 10], [1, 0], clamp) : 1;

  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.z})` }}>
        <svg width={W} height={GROUND_H + 40} style={{ position: 'absolute', overflow: 'visible' }}>
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.landTop} />
              <stop offset="1" stopColor={C.landBottom} />
            </linearGradient>
            <radialGradient id="bloom">
              <stop offset="0" stopColor={C.bloom} stopOpacity="0.95" />
              <stop offset="0.6" stopColor={C.bloom} stopOpacity="0.7" />
              <stop offset="1" stopColor={C.bloom} stopOpacity="0" />
            </radialGradient>
            <clipPath id="island">
              <path d={COAST_D} />
            </clipPath>
          </defs>
          <rect x={-3000} y={-3000} width={7000} height={7000} fill={C.sea} opacity={0.35} />
          <path d={COAST_D} fill={C.slabDark} transform="translate(0,22)" />
          <path d={COAST_D} fill={C.slab} transform="translate(0,12)" />
          <path d={COAST_D} fill="url(#land)" stroke={C.landEdge} strokeWidth={2} />
          <g clipPath="url(#island)">
            {SPOTS.map((s, i) => {
              const r0 = revealOf(i);
              if (frame < r0) return null;
              const g = spring({ frame: frame - r0, fps, config: { damping: 30, stiffness: 40 } });
              const p = proj(s.lng, s.lat);
              return <circle key={s.id} cx={p.x} cy={p.y} r={40 + g * 120} fill="url(#bloom)" />;
            })}
            {RIDGES.map((r, i) => (
              <path key={i} d={smoothPath(r.map(([a, b]) => proj(a, b)), false)} stroke={C.ridge} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.35} />
            ))}
            {RIVERS.map((r, i) => (
              <path key={i} d={smoothPath(r.map(([a, b]) => proj(a, b)), false)} stroke={C.river} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
            ))}
          </g>
          {frame >= T.walkStart - 10 && frame < T.zoomOut + 10 ? (
            <g opacity={interpolate(frame, [T.walkStart - 10, T.walkStart, T.zoomOut, T.zoomOut + 10], [0, 1, 1, 0], clamp)}>
              <path d={WALK_D} stroke={C.accent} strokeOpacity={0.4} strokeWidth={2.4} strokeDasharray="5 5" fill="none" strokeLinecap="round" />
              <path d={WALK_D} stroke={C.accent} strokeWidth={3.2} fill="none" pathLength={1} strokeDasharray={`${walk} 1`} strokeLinecap="round" />
            </g>
          ) : null}
        </svg>
        {SPOTS.map((s, i) => (
          <Token key={s.id} spot={s} frame={frame} reveal={revealOf(i)} size={(s.id === 'jiufen' ? 1.25 : 1) * tokBase} />
        ))}
        {frame >= T.walkStart - 10 && frame < T.zoomOut ? (
          <div style={{ position: 'absolute', left: me.x, top: me.y }}>
            <div
              style={{
                position: 'absolute',
                left: -dotR * (1 + pulse * 2),
                top: -dotR * (1 + pulse * 2),
                width: dotR * 2 * (1 + pulse * 2),
                height: dotR * 2 * (1 + pulse * 2),
                borderRadius: '50%',
                background: '#2F7DF6',
                opacity: 0.35 * (1 - pulse),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -dotR,
                top: -dotR,
                width: dotR * 2,
                height: dotR * 2,
                borderRadius: '50%',
                background: '#2F7DF6',
                border: `${dotR * 0.35}px solid white`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ) : null}
      </div>

      {frame >= T.walkStart - 6 && frame < T.unlock + 4 ? (
        <div
          style={{
            position: 'absolute',
            top: SCREEN_CY + (JIUFEN.y - cam.y) * cam.z - 1.25 * tokBase * 0.82 * cam.z - 90,
            left: 540 + (JIUFEN.x - cam.x) * cam.z,
            transform: `translateX(-50%) scale(${pillIn * pillBump})`,
            background: arrived ? C.accent : C.card,
            color: arrived ? '#fff' : C.ink,
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 700,
            padding: '16px 34px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            boxShadow: '0 14px 30px rgba(80,64,36,0.2)',
            opacity: interpolate(frame, [T.unlock - 4, T.unlock + 4], [1, 0], clamp),
          }}
        >
          {arrived ? '抵達！' : `？？？ · ${meters.toLocaleString('en-US')} m`}
        </div>
      ) : null}

      {frame >= T.zoomOut + 10 ? (
        <div
          style={{
            position: 'absolute',
            top: 1640,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: interpolate(frame, [T.zoomOut + 10, T.zoomOut + 20, T.mapOut - 14, T.mapOut], [0, 1, 1, 0], clamp),
          }}
        >
          <div
            style={{
              background: C.card,
              borderRadius: 999,
              padding: '18px 44px',
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 700,
              color: C.ink,
              boxShadow: '0 14px 30px rgba(80,64,36,0.16)',
            }}
          >
            已收藏 <span style={{ color: C.accent, fontSize: 56 }}>{collected}</span> / 159
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ unlock --------

const Unlock: React.FC = () => {
  const frame = useCurrentFrame(); // local to the Sequence
  const { fps } = useVideoConfig();
  const dur = T.unlockEnd - T.unlock;
  const back = interpolate(frame, [0, 10, dur - 12, dur], [0, 0.94, 0.94, 0], clamp);
  const cardIn = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const cardOut = interpolate(frame, [dur - 14, dur], [0, 1], { ...clamp, easing: ease });
  const PRESS = 26;
  const OPEN = 34;
  const press = frame >= PRESS && frame < PRESS + 8 ? interpolate(frame, [PRESS, PRESS + 3, PRESS + 8], [1, 0.9, 1], clamp) : 1;
  const colour = interpolate(frame, [OPEN, OPEN + 8], [0, 1], clamp);
  const pop = spring({ frame: frame - OPEN, fps, config: { damping: 8, stiffness: 160 } });
  const flash = interpolate(frame, [OPEN - 1, OPEN + 2, OPEN + 16], [0, 1, 0], clamp);
  const textIn = spring({ frame: frame - OPEN - 6, fps, config: { damping: 14 } });
  const rays = interpolate(frame, [OPEN, OPEN + 10], [0, 1], clamp);
  const sparkles = [
    { x: -330, y: -250, s: 70, d: 2 },
    { x: 320, y: -300, s: 90, d: 5 },
    { x: 360, y: 120, s: 60, d: 8 },
    { x: -360, y: 160, s: 54, d: 11 },
    { x: 0, y: -400, s: 50, d: 6 },
  ];
  const tile = frame >= OPEN ? 0.9 + pop * 0.1 : 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: C.bg, opacity: back }} />
      <AbsoluteFill
        style={{
          opacity: 1 - cardOut,
          transform: `translateY(${(1 - cardIn) * 500 + cardOut * 80}px) scale(${1 - cardOut * 0.15})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 540 - 560,
            top: 860 - 560,
            width: 1120,
            height: 1120,
            borderRadius: '50%',
            background: `repeating-conic-gradient(from ${frame * 1.2}deg, rgba(245,177,76,0.24) 0deg 10deg, rgba(245,177,76,0) 10deg 30deg)`,
            maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
            opacity: rays,
            transform: `scale(${0.6 + rays * 0.4})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 540 - 340,
            top: 860 - 340,
            width: 680,
            height: 680,
            borderRadius: 64,
            background: C.sealedBg,
            boxShadow: '0 40px 80px rgba(80,64,36,0.18)',
            overflow: 'hidden',
            transform: `scale(${tile})`,
          }}
        >
          <Img src={staticFile('day/jiufen.jpg')} style={{ position: 'absolute', width: 680, height: 680, opacity: colour }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - colour }}>
            <Img src={staticFile('sil/jiufen.png')} style={{ width: 520, height: 520 }} />
          </div>
          <AbsoluteFill style={{ background: 'white', opacity: flash }} />
        </div>
        {sparkles.map((s, i) => {
          const k = spring({ frame: frame - OPEN - s.d, fps, config: { damping: 9 } });
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 540 + s.x - s.s / 2,
                top: 860 + s.y - s.s / 2,
                fontSize: s.s,
                lineHeight: 1,
                color: '#F5B14C',
                transform: `scale(${k}) rotate(${frame * 2 + i * 30}deg)`,
                opacity: k,
              }}
            >
              ✦
            </div>
          );
        })}
        <div style={{ position: 'absolute', top: 1240, width: '100%', textAlign: 'center', fontFamily: FONT }}>
          {frame < OPEN ? (
            <div style={{ fontSize: 84, fontWeight: 900, letterSpacing: 18, color: C.sealedInk }}>？？？</div>
          ) : (
            <div style={{ transform: `scale(${0.7 + textIn * 0.3})`, opacity: textIn }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.accent, letterSpacing: 6 }}>✦ 新地標 ✦</div>
              <div style={{ fontSize: 96, fontWeight: 900, color: C.ink, marginTop: 6 }}>九份老街</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: C.sub, marginTop: 8, letterSpacing: 2 }}>2026.11.11 · 霧 · 18°</div>
            </div>
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 1560,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: interpolate(frame, [OPEN, OPEN + 6], [1, 0], clamp),
          }}
        >
          <div
            style={{
              background: C.accent,
              color: '#fff',
              fontFamily: FONT,
              fontSize: 50,
              fontWeight: 800,
              padding: '30px 90px',
              borderRadius: 999,
              boxShadow: '0 18px 36px rgba(184,113,26,0.35)',
              transform: `scale(${press})`,
            }}
          >
            留下足跡
          </div>
          {frame >= PRESS ? (
            <div
              style={{
                position: 'absolute',
                top: 50,
                left: 540,
                width: 40,
                height: 40,
                marginLeft: -20,
                marginTop: -20,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                transform: `scale(${interpolate(frame, [PRESS, PRESS + 12], [0.5, 8], clamp)})`,
                opacity: interpolate(frame, [PRESS, PRESS + 12], [0.9, 0], clamp),
              }}
            />
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ phones --------

const Phones: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.end - T.phones + 6;
  const a = spring({ frame, fps, config: { damping: 15, stiffness: 90 } });
  const b = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 90 } });
  const vis = interpolate(frame, [0, 10, dur - 10, dur], [0, 1, 1, 0], clamp);
  const drift = interpolate(frame, [0, dur], [0, -40]);
  const chips = [
    { t: '2026.11.11', x: 60, y: 560, d: 18 },
    { t: '霧 · 18°', x: 730, y: 470, d: 24 },
    { t: '照片 3 張', x: 720, y: 1600, d: 30 },
  ];
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <Phone
        src="screens/05-passport.jpg"
        width={440}
        style={{ left: 60, top: 660 + (1 - a) * 900 + drift, transform: `rotate(${-7 + (1 - a) * -10}deg)` }}
      />
      <Phone
        src="screens/07-share.jpg"
        width={440}
        style={{ left: 560, top: 560 + (1 - b) * 900 + drift * 1.6, transform: `rotate(${6 + (1 - b) * 10}deg)` }}
      />
      {chips.map((c, i) => {
        const k = spring({ frame: frame - c.d, fps, config: { damping: 10 } });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y + Math.sin((frame + i * 17) / 10) * 10,
              background: C.card,
              color: C.ink,
              fontFamily: FONT,
              fontSize: 40,
              fontWeight: 700,
              padding: '16px 32px',
              borderRadius: 999,
              boxShadow: '0 14px 30px rgba(80,64,36,0.2)',
              transform: `scale(${k})`,
            }}
          >
            {c.t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------- end --------

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icon = spring({ frame: frame - 4, fps, config: { damping: 11, stiffness: 120 } });
  const name = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const sub = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const cta = spring({ frame: frame - 30, fps, config: { damping: 12 } });
  const vis = interpolate(frame, [0, 10], [0, 1], clamp);
  const floats = [
    { id: 'taipei-101', x: 60, y: 240, s: 240 },
    { id: 'sun-moon-lake', x: 780, y: 280, s: 240 },
    { id: 'kenting', x: 40, y: 1460, s: 250 },
    { id: 'taroko', x: 790, y: 1430, s: 240 },
  ];
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      {floats.map((f, i) => {
        const k = spring({ frame: frame - 6 - i * 4, fps, config: { damping: 12 } });
        return (
          <Img
            key={f.id}
            src={staticFile(`lm/${f.id}.png`)}
            style={{
              position: 'absolute',
              left: f.x,
              top: f.y + Math.sin((frame + i * 13) / 11) * 14,
              width: f.s,
              height: f.s,
              transform: `scale(${k})`,
            }}
          />
        );
      })}
      <div style={{ position: 'absolute', top: 600, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT }}>
        <Img
          src={staticFile('icon.png')}
          style={{ width: 280, height: 280, borderRadius: 64, boxShadow: '0 30px 60px rgba(80,64,36,0.25)', transform: `scale(${icon})` }}
        />
        <div style={{ marginTop: 50, fontSize: 120, fontWeight: 800, color: C.ink, letterSpacing: 2, opacity: name, transform: `translateY(${(1 - name) * 40}px)` }}>
          Islandia
        </div>
        <div style={{ marginTop: 10, fontSize: 52, fontWeight: 700, color: C.sub, opacity: sub, transform: `translateY(${(1 - sub) * 40}px)` }}>
          走到景點，收藏一座小島
        </div>
        <div
          style={{
            marginTop: 70,
            background: C.ink,
            color: '#fff',
            fontSize: 46,
            fontWeight: 700,
            padding: '26px 64px',
            borderRadius: 999,
            transform: `scale(${cta})`,
          }}
        >
          App Store 免費下載
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------- root -------

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(184,113,26,0.10) 2px, transparent 2px)', backgroundSize: '36px 36px' }} />
      <Sequence durationInFrames={T.hookEnd}>
        <Hook />
      </Sequence>
      <MapScene />
      <Sequence from={T.unlock} durationInFrames={T.unlockEnd - T.unlock}>
        <Unlock />
      </Sequence>
      <Sequence from={T.phones} durationInFrames={T.end - T.phones + 6}>
        <Phones />
      </Sequence>
      <Sequence from={T.end}>
        <EndCard />
      </Sequence>

      <Caption text="這是哪裡？" from={4} to={T.hookEnd} />
      <Caption kicker="STEP 1" text="要走到，才看得到" accent="走到" from={T.walkStart - 14} to={T.unlock} />
      <Caption kicker="STEP 2" text="留下足跡，模型開箱" accent="開箱" from={T.unlock + 4} to={T.unlockEnd - 4} />
      <Caption kicker="STEP 3" text="收集全台灣 159 座" accent="159" from={T.zoomOut + 6} to={T.mapOut - 6} />
      <Caption kicker="STEP 4" text="每一座，都記得那一天" accent="那一天" from={T.phones + 6} to={T.end} />
    </AbsoluteFill>
  );
};
