export const theme = {
  bg: '#0B1220',
  bgElevated: '#121C2E',
  card: '#16213A',
  cardBorder: '#223150',
  accent: '#F5B14C',
  accentSoft: 'rgba(245,177,76,0.16)',
  text: '#F2EEE3',
  subtext: '#8E9AAF',
  faint: '#5A677D',
  success: '#6FCF97',
  danger: '#E57373',
  locked: '#1A2436',
};

export const rarityMeta: Record<string, { label: string; dots: number; color: string }> = {
  common: { label: 'COMMON', dots: 1, color: '#9BB0C9' },
  rare: { label: 'RARE', dots: 2, color: '#6FB7F5' },
  epic: { label: 'EPIC', dots: 3, color: '#C08BF5' },
  legendary: { label: 'LEGENDARY', dots: 4, color: '#F5B14C' },
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
