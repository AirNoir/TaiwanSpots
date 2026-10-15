import { isNightAt, Season, seasonOf, Weather } from './atmosphere';
import { AtmosphereOverride, useStore } from './store';

// Where screens get "what season / time of day / sky is it" from. In
// production that is the calendar, the clock and Open-Meteo; in development
// the ME tab (or exp://…/--/dev/atmosphere) can force any combination so
// every variant can be previewed.

const NONE: AtmosphereOverride = {};

export function useAtmosphereOverride(): AtmosphereOverride {
  const o = useStore((s) => s.atmosphereOverride);
  return __DEV__ ? o : NONE;
}

export function useSeason(): Season {
  const o = useAtmosphereOverride();
  return o.season ?? seasonOf();
}

/** Night: the dev override, else the weather service's is_day, else the local clock. */
export function useNight(weather?: Weather | null): boolean {
  const o = useAtmosphereOverride();
  if (o.night != null) return o.night;
  if (weather) return !weather.isDay;
  return isNightAt();
}

/** Applies the override to a fetched weather value; synthesises one when a sky is forced with no data. */
export function overrideWeather(w: Weather | null, o: AtmosphereOverride): Weather | null {
  if (!o.sky && o.night == null) return w;
  const base: Weather = w ?? { sky: 'clear', temperature: 24, isDay: !isNightAt(), fetchedAt: Date.now() };
  return { ...base, sky: o.sky ?? base.sky, isDay: o.night == null ? base.isDay : !o.night };
}
