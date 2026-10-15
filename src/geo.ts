export interface LatLng {
  latitude: number;
  longitude: number;
}

const R = 6371000; // earth radius in meters

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1).replace(/\.0$/, '')} km`;
  return `${Math.round(m / 1000)} km`;
}

/**
 * Every spot can be collected from at least this far away (metres). Spots that
 * declare a larger radius of their own (national parks, mountain areas) keep it.
 */
export const MIN_CHECKIN_RADIUS = 1000;

export function checkinRadius(spot: { checkinRadius: number }): number {
  return Math.max(spot.checkinRadius, MIN_CHECKIN_RADIUS);
}

// Demo presets for simulator testing
export const DEV_LOCATIONS: { label: string; coord: LatLng }[] = [
  { label: '台北車站', coord: { latitude: 25.0478, longitude: 121.517 } },
  { label: '台中市區', coord: { latitude: 24.1439, longitude: 120.6794 } },
  { label: '台南市區', coord: { latitude: 22.9917, longitude: 120.2049 } },
  { label: '花蓮市區', coord: { latitude: 23.9769, longitude: 121.6044 } },
];
