// A "World" is the miniature country base map that landmark tokens sit on
// (visual spec v0.2 §10, §20). Nothing here is Taiwan-specific except the
// TAIWAN constant, so Japan / Korea can be added as further WorldDefs.

export type LngLat = [number, number];

export interface WorldRegion {
  id: string;
  label: string;
  zh: string;
  /** Representative point (lng, lat) for the region's weather — a city centre, never the traveller. */
  center: LngLat;
}

export interface WorldDef {
  id: string;
  name: string;
  bounds: { lngMin: number; lngMax: number; latMin: number; latMax: number };
  coastline: LngLat[]; // main island outline, clockwise
  islands: { center: LngLat; rx: number; ry: number }[]; // small offshore islands (deg)
  ridges: LngLat[][]; // mountain range spines, north → south
  rivers: LngLat[][]; // source → mouth
  regions: WorldRegion[];
}

export const TAIWAN: WorldDef = {
  id: 'taiwan',
  name: 'Taiwan',
  bounds: { lngMin: 119.95, lngMax: 122.05, latMin: 21.8, latMax: 25.4 },
  coastline: [
    [121.54, 25.3], [121.7, 25.19], [121.8, 25.14], [121.93, 25.02], [121.86, 24.88],
    [121.83, 24.7], [121.86, 24.57], [121.75, 24.38], [121.7, 24.25], [121.63, 24.03],
    [121.53, 23.7], [121.45, 23.35], [121.42, 23.12], [121.18, 22.8], [120.98, 22.55],
    [120.9, 22.3], [120.86, 22.05], [120.85, 21.9], [120.73, 21.93], [120.7, 22.08],
    [120.62, 22.3], [120.45, 22.48], [120.27, 22.6], [120.2, 22.75], [120.14, 22.98],
    [120.09, 23.12], [120.08, 23.35], [120.15, 23.7], [120.24, 23.9], [120.38, 24.05],
    [120.53, 24.3], [120.62, 24.47], [120.72, 24.66], [120.87, 24.83], [121.0, 24.99],
    [121.15, 25.08], [121.4, 25.18], [121.5, 25.28],
  ],
  islands: [
    { center: [121.49, 22.66], rx: 0.04, ry: 0.035 }, // Green Island
    { center: [121.55, 22.04], rx: 0.06, ry: 0.045 }, // Orchid Island
  ],
  ridges: [
    // Central Mountain Range
    [[121.55, 24.75], [121.38, 24.4], [121.25, 24.1], [121.1, 23.7], [120.98, 23.3], [120.88, 22.9], [120.8, 22.45]],
    // Xueshan (Snow Mountain) range, branching south-west from the north-east coast
    [[121.62, 24.92], [121.42, 24.62], [121.23, 24.38]],
    // Yushan / Alishan range, west of the central spine
    [[120.98, 23.75], [120.88, 23.45], [120.78, 23.15]],
    // Coastal Mountain Range (east rift valley's sea side)
    [[121.55, 23.85], [121.42, 23.4], [121.28, 23.0]],
  ],
  rivers: [
    [[121.55, 24.95], [121.48, 25.05], [121.41, 25.17]], // Tamsui
    [[121.0, 23.85], [120.6, 23.85], [120.23, 23.83]], // Zhuoshui
    [[120.62, 23.05], [120.5, 22.75], [120.43, 22.48]], // Gaoping
  ],
  regions: [
    { id: 'north', label: 'NORTH', zh: '北台灣', center: [121.52, 25.05] }, // Taipei
    { id: 'central', label: 'CENTRAL', zh: '中台灣', center: [120.68, 24.15] }, // Taichung
    { id: 'south', label: 'SOUTH', zh: '南台灣', center: [120.3, 22.65] }, // Kaohsiung
    { id: 'east', label: 'EAST', zh: '東台灣', center: [121.6, 23.98] }, // Hualien
  ],
};

// Camera tilt of the isometric view: ground-plane depth is foreshortened
// to look like a ~40° elevated camera (spec §2).
export const WORLD_TILT = 0.62;

/** Ground-plane height of a world relative to its width (after tilt). */
export function worldAspect(world: WorldDef) {
  const { lngMin, lngMax, latMin, latMax } = world.bounds;
  const midLat = ((latMin + latMax) / 2) * (Math.PI / 180);
  return ((latMax - latMin) / ((lngMax - lngMin) * Math.cos(midLat))) * WORLD_TILT;
}

/**
 * Maps a geographic point (+ optional elevation z, as a fraction of width)
 * to screen coordinates inside a world view of the given width.
 */
export function makeProjector(world: WorldDef, width: number, topPad = 0) {
  const { lngMin, lngMax, latMax, latMin } = world.bounds;
  const groundH = worldAspect(world) * width;
  return (lng: number, lat: number, z = 0) => ({
    x: ((lng - lngMin) / (lngMax - lngMin)) * width,
    y: topPad + ((latMax - lat) / (latMax - latMin)) * groundH - z * width,
  });
}
