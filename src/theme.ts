import type { Season } from './atmosphere';
import { useStore } from './store';

export type ThemeMode = 'light' | 'dark';

export interface WorldPalette {
  sea: string;
  landTop: string;
  landBottom: string;
  landEdge: string;
  slab: string;
  slabDark: string;
  baseShadow: string;
  bloom: string;
  ridgeLit: [string, string];
  ridgeFog: [string, string];
  river: string;
  fog: string;
  fogOpacity: number;
  light: string;
  lightCore: string;
  pin: string;
  tokenShadow: string;
  cloud: string; // weather clouds over a region
  rain: string; // rain streaks
  snow: string; // snow caps and flakes
  nightVeil: string; // darkens the land after dark
  nightSky: string; // the map panel behind the island after dark
  star: string;
}

/** Seasonal recolouring of discovered terrain; undiscovered land stays fogged grey. */
export interface SeasonTint {
  ridgeLit: [string, string];
  bloom: string;
  blossom?: string; // spring petals around discovered spots
  snowCaps: boolean; // white tops on the highest central peaks
}

export const seasonTints: Record<ThemeMode, Record<Season, SeasonTint>> = {
  light: {
    spring: { ridgeLit: ['#A8D67E', '#73A85A'], bloom: '#9BD178', blossom: '#F4A6B8', snowCaps: false },
    summer: { ridgeLit: ['#8CC56A', '#5C9448'], bloom: '#7FC25C', snowCaps: false },
    autumn: { ridgeLit: ['#D9B562', '#A4813F'], bloom: '#CDAA5C', snowCaps: false },
    winter: { ridgeLit: ['#A9BFA6', '#7C9680'], bloom: '#A3BF95', snowCaps: true },
  },
  dark: {
    spring: { ridgeLit: ['#9ECB78', '#6A9A55'], bloom: '#93C96F', blossom: '#E59AAD', snowCaps: false },
    summer: { ridgeLit: ['#86B96A', '#56874A'], bloom: '#80B861', snowCaps: false },
    autumn: { ridgeLit: ['#C9A65A', '#8F6F38'], bloom: '#B99A52', snowCaps: false },
    winter: { ridgeLit: ['#98AE9C', '#6E8574'], bloom: '#93AC8A', snowCaps: true },
  },
};

export interface Palette {
  mode: ThemeMode;
  bg: string;
  bgElevated: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentSoft: string;
  onAccent: string; // text / icons on an accent-filled surface
  text: string;
  subtext: string;
  faint: string;
  success: string;
  danger: string;
  locked: string;
  lockedIcon: string;
  lockOverlay: string;
  scrim: string; // dark backdrop for the full-screen image viewer (both themes)
  backdrop: string; // themed backdrop for unlock / share overlays
  tabBar: string;
  tabBarBorder: string;
  statusBar: 'light' | 'dark';
  world: WorldPalette;
}

const dark: Palette = {
  mode: 'dark',
  bg: '#0B1220',
  bgElevated: '#121C2E',
  card: '#16213A',
  cardBorder: '#223150',
  accent: '#F5B14C',
  accentSoft: 'rgba(245,177,76,0.16)',
  onAccent: '#1B1405',
  text: '#F2EEE3',
  subtext: '#8E9AAF',
  faint: '#5A677D',
  success: '#6FCF97',
  danger: '#E57373',
  locked: '#141D30',
  lockedIcon: '#8E9AAF',
  lockOverlay: 'rgba(8,12,22,0.25)',
  scrim: 'rgba(5,9,18,0.95)',
  backdrop: 'rgba(5,9,18,0.96)',
  tabBar: '#0A101D',
  tabBarBorder: '#1A2436',
  statusBar: 'light',
  world: {
    sea: '#1E3350',
    landTop: '#56636B',
    landBottom: '#46525A',
    landEdge: '#76838A',
    slab: '#2E2822',
    slabDark: '#221D19',
    baseShadow: 'rgba(0,0,0,0.35)',
    bloom: '#8EC06C',
    ridgeLit: ['#93C072', '#5F8E4B'],
    ridgeFog: ['#68757D', '#505C64'],
    river: '#6F9CC0',
    fog: '#DCE4EC',
    fogOpacity: 0.5,
    light: '#FFD27A',
    lightCore: '#FFF4D6',
    pin: '220,228,236',
    tokenShadow: 'rgba(0,0,0,0.35)',
    cloud: '#8A96A6',
    rain: '#9CC0E0',
    snow: '#F4F7FA',
    nightVeil: 'rgba(2,6,18,0.5)',
    nightSky: '#0A1222',
    star: '#E8EEF8',
  },
};

// Warm ivory, matching the cream display plinths of the dioramas.
const light: Palette = {
  mode: 'light',
  bg: '#F6F1E7',
  bgElevated: '#FBF8F2',
  card: '#FFFFFF',
  cardBorder: '#E7DFCF',
  accent: '#B8711A',
  accentSoft: 'rgba(184,113,26,0.12)',
  onAccent: '#FFFFFF',
  text: '#1E2531',
  subtext: '#5F6877',
  faint: '#9AA0A9',
  success: '#2F8F5B',
  danger: '#C94848',
  locked: '#E9E2D4',
  lockedIcon: '#8A8F98',
  lockOverlay: 'rgba(246,241,231,0.35)',
  scrim: 'rgba(20,18,14,0.94)',
  backdrop: 'rgba(246,241,231,0.97)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7DFCF',
  statusBar: 'dark',
  world: {
    sea: '#BFD8EA',
    landTop: '#D3D6CD',
    landBottom: '#C3C7BC',
    landEdge: '#A9AFA4',
    slab: '#CDB896',
    slabDark: '#B39C78',
    baseShadow: 'rgba(80,64,36,0.18)',
    bloom: '#8DC56A',
    ridgeLit: ['#9CCB78', '#6C9C55'],
    ridgeFog: ['#B6BAB2', '#9EA39A'],
    river: '#7FB2D9',
    fog: '#FFFFFF',
    fogOpacity: 0.75,
    light: '#FFB933',
    lightCore: '#FFF7E3',
    pin: '70,80,92',
    tokenShadow: 'rgba(80,64,36,0.28)',
    cloud: '#C3CAD3',
    rain: '#5F8FB8',
    snow: '#FFFFFF',
    nightVeil: 'rgba(14,22,52,0.5)',
    nightSky: '#1B2542',
    star: '#FFFFFF',
  },
};

export const palettes: Record<ThemeMode, Palette> = { light, dark };

/** Current palette; light by default, switchable in the ME tab. */
export function useTheme(): Palette {
  return palettes[useStore((s) => s.themeMode)];
}

/** Theme-aware StyleSheet: `const useStyles = makeStyles((t) => StyleSheet.create({...}))`. */
export function makeStyles<T>(factory: (t: Palette) => T) {
  const cache = new Map<ThemeMode, T>();
  return function useStyles(): T {
    const t = useTheme();
    let styles = cache.get(t.mode);
    if (!styles) {
      styles = factory(t);
      cache.set(t.mode, styles);
    }
    return styles;
  };
}

export const rarityMeta: Record<string, { label: string; zh: string; dots: number; color: string }> = {
  common: { label: 'COMMON', zh: '普通', dots: 1, color: '#9BB0C9' },
  rare: { label: 'RARE', zh: '稀有', dots: 2, color: '#6FB7F5' },
  epic: { label: 'EPIC', zh: '史詩', dots: 3, color: '#C08BF5' },
  legendary: { label: 'LEGENDARY', zh: '傳說', dots: 4, color: '#F5B14C' },
};

// icon: MaterialCommunityIcons name
export const categoryMeta: Record<string, { label: string; zh: string; icon: string }> = {
  landmark: { label: 'LANDMARK', zh: '地標', icon: 'city-variant-outline' },
  nature: { label: 'NATURE', zh: '自然', icon: 'pine-tree' },
  culture: { label: 'CULTURE', zh: '文化', icon: 'coach-lamp' },
  mountain: { label: 'MOUNTAIN', zh: '山岳', icon: 'image-filter-hdr' },
  ocean: { label: 'OCEAN', zh: '海洋', icon: 'waves' },
  historic: { label: 'HISTORIC', zh: '古蹟', icon: 'castle' },
  transport: { label: 'TRANSPORT', zh: '交通', icon: 'train' },
  food: { label: 'FOOD', zh: '美食', icon: 'silverware-fork-knife' },
  hidden: { label: 'HIDDEN', zh: '秘境', icon: 'help-circle-outline' },
};

export const regionMeta: Record<string, { label: string; zh: string }> = {
  north: { label: 'NORTH', zh: '北台灣' },
  central: { label: 'CENTRAL', zh: '中台灣' },
  south: { label: 'SOUTH', zh: '南台灣' },
  east: { label: 'EAST', zh: '東台灣' },
};
