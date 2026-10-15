import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { LatLng } from './geo';

// Season and weather ("atmosphere") of a place. Seasons come from the calendar;
// weather comes from Open-Meteo for fixed landmark / region coordinates only —
// the traveller's own position is never sent anywhere.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Sky = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'thunder' | 'snow';

export interface Weather {
  sky: Sky;
  temperature: number; // °C, rounded
  isDay: boolean;
  fetchedAt: number; // ms since epoch
}

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// icon: MaterialCommunityIcons name
export const seasonMeta: Record<Season, { label: string; zh: string; icon: string }> = {
  spring: { label: 'SPRING', zh: '春', icon: 'flower-outline' },
  summer: { label: 'SUMMER', zh: '夏', icon: 'white-balance-sunny' },
  autumn: { label: 'AUTUMN', zh: '秋', icon: 'leaf-maple' },
  winter: { label: 'WINTER', zh: '冬', icon: 'snowflake' },
};

/** Taiwan's seasons by calendar month (CWA convention): Mar–May, Jun–Aug, Sep–Nov, Dec–Feb. */
export function seasonOf(date: Date = new Date()): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export const skyMeta: Record<Sky, { zh: string; icon: string; nightIcon?: string }> = {
  clear: { zh: '晴', icon: 'weather-sunny', nightIcon: 'weather-night' },
  cloudy: { zh: '多雲', icon: 'weather-partly-cloudy', nightIcon: 'weather-night-partly-cloudy' },
  overcast: { zh: '陰', icon: 'weather-cloudy' },
  fog: { zh: '霧', icon: 'weather-fog' },
  drizzle: { zh: '毛毛雨', icon: 'weather-rainy' },
  rain: { zh: '雨', icon: 'weather-pouring' },
  thunder: { zh: '雷雨', icon: 'weather-lightning-rainy' },
  snow: { zh: '雪', icon: 'weather-snowy' },
};

export const skyIcon = (w: Weather) => (!w.isDay && skyMeta[w.sky].nightIcon) || skyMeta[w.sky].icon;
export const isWet = (sky: Sky) => sky === 'drizzle' || sky === 'rain' || sky === 'thunder';
export const describeWeather = (w: Weather) => `${skyMeta[w.sky].zh} ${w.temperature}°`;

/** WMO 4677 weather codes as returned by Open-Meteo's `weather_code`. */
export function skyFromWmo(code: number): Sky {
  if (code === 0) return 'clear';
  if (code <= 2) return 'cloudy';
  if (code === 3) return 'overcast';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'thunder';
}

/** Low-opacity wash laid over a diorama so a collection carries its season. */
export const seasonWash: Record<Season, string | null> = {
  spring: 'rgba(255,176,200,0.08)',
  summer: null,
  autumn: 'rgba(226,150,64,0.13)',
  winter: 'rgba(120,160,220,0.15)',
};

// ── Open-Meteo (free, no key) ─────────────────────────────────
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TTL_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'islandia-weather-v1';

// ~1 km cells: two spots that close share one forecast.
const keyOf = (p: LatLng) => `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;

const cache = new Map<string, Weather>();
const inflight = new Map<string, Promise<void>>();
let restored: Promise<void> | null = null;

function restore() {
  if (!restored) {
    restored = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Weather>)) {
          if (!cache.has(k)) cache.set(k, v);
        }
      })
      .catch(() => undefined);
  }
  return restored;
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache))).catch(() => undefined);
}

/** Current conditions for several fixed points in one request. */
export async function fetchWeather(points: LatLng[]): Promise<(Weather | null)[]> {
  if (!points.length) return [];
  const url =
    `${ENDPOINT}?latitude=${points.map((p) => p.latitude.toFixed(3)).join(',')}` +
    `&longitude=${points.map((p) => p.longitude.toFixed(3)).join(',')}` +
    '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTaipei';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  const list: any[] = Array.isArray(json) ? json : [json];
  const now = Date.now();
  return points.map((_, i) => {
    const c = list[i]?.current;
    if (!c || typeof c.weather_code !== 'number') return null;
    return {
      sky: skyFromWmo(c.weather_code),
      temperature: Math.round(c.temperature_2m),
      isDay: c.is_day === 1,
      fetchedAt: now,
    };
  });
}

const fresh = (w: Weather | undefined): w is Weather => !!w && Date.now() - w.fetchedAt < TTL_MS;

/**
 * Current weather at each point — null until known (first load, or offline).
 * Cached for 30 minutes across the app and across launches; a stale value is
 * shown while a refresh is in flight.
 */
export function useWeather(points: LatLng[]): (Weather | null)[] {
  const key = points.map(keyOf).join('|');
  const [, bump] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      await restore();
      if (alive) bump((n) => n + 1);
      const stale = points.filter((p) => !fresh(cache.get(keyOf(p))));
      if (!stale.length) return;
      const k = stale.map(keyOf).join('|');
      let job = inflight.get(k);
      if (!job) {
        job = fetchWeather(stale)
          .then((list) => {
            list.forEach((w, i) => w && cache.set(keyOf(stale[i]), w));
            persist();
          })
          .catch(() => undefined)
          .finally(() => inflight.delete(k));
        inflight.set(k, job);
      }
      await job;
      if (alive) bump((n) => n + 1);
    };
    void refresh();
    const timer = setInterval(refresh, TTL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // `key` is the content of `points`; the array itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return points.map((p) => cache.get(keyOf(p)) ?? null);
}
