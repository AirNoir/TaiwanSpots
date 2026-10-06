import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { SPOTS } from '../data/spots';
import { theme } from '../theme';

// Simplified Taiwan coastline (lng, lat), clockwise from the north tip
const COAST: [number, number][] = [
  [121.54, 25.3], [121.92, 25.05], [121.87, 24.85], [121.83, 24.55],
  [121.65, 24.22], [121.62, 23.98], [121.5, 23.48], [121.42, 23.1],
  [121.23, 22.72], [120.98, 22.28], [120.87, 21.9], [120.72, 21.98],
  [120.45, 22.48], [120.27, 22.62], [120.13, 23.05], [120.07, 23.38],
  [120.12, 23.82], [120.46, 24.22], [120.78, 24.85], [121.02, 25.06],
  [121.4, 25.2],
];

const LNG_MIN = 119.95, LNG_MAX = 122.05, LAT_MIN = 21.75, LAT_MAX = 25.45;

interface Props {
  width: number;
  height: number;
  collectedIds: Set<string>;
  interactive?: boolean;
}

export function TaiwanMap({ width, height, collectedIds, interactive = true }: Props) {
  const router = useRouter();

  const project = (lng: number, lat: number) => ({
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * width,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height,
  });

  const islandPath = useMemo(() => {
    const pts = COAST.map(([lng, lat]) => project(lng, lat));
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const next = pts[(i + 1) % pts.length];
      const m = mid(p, next);
      if (i === 0) {
        const prev = pts[pts.length - 1];
        const m0 = mid(prev, p);
        d = `M ${m0.x} ${m0.y}`;
      }
      d += ` Q ${p.x} ${p.y} ${m.x} ${m.y}`;
    }
    return d + ' Z';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="islandGlow" cx="50%" cy="40%" r="75%">
            <Stop offset="0%" stopColor="#24395C" />
            <Stop offset="100%" stopColor="#17263F" />
          </RadialGradient>
        </Defs>
        <Path
          d={islandPath}
          fill="url(#islandGlow)"
          stroke="#3A5375"
          strokeWidth={1.5}
        />
      </Svg>
      {SPOTS.map((s) => {
        const { x, y } = project(s.longitude, s.latitude);
        const collected = collectedIds.has(s.id);
        return (
          <Pressable
            key={s.id}
            disabled={!interactive}
            onPress={() => router.push(`/spot/${s.id}`)}
            hitSlop={8}
            style={{
              position: 'absolute',
              left: x - 14,
              top: y - 14,
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {collected ? (
              <>
                <View
                  style={{
                    position: 'absolute',
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(245,177,76,0.22)',
                  }}
                />
                <MaterialCommunityIcons name={s.art.icon as any} size={15} color={theme.accent} />
              </>
            ) : (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: theme.faint,
                  opacity: 0.7,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
