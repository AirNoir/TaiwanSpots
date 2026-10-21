import { SEASONS } from './atmosphere';
import { SPOTS, spotById } from './data/spots';
import { CollectionEntry, entrySeason } from './store';

export interface AchievementDef {
  id: string;
  title: string; // English title
  zh: string; // Chinese description
  zhTitle: string;
  en: string; // English description
  icon: string; // MaterialCommunityIcons name
  check: (collected: CollectionEntry[]) => boolean;
  progress: (collected: CollectionEntry[]) => { now: number; goal: number };
}

const byCategory = (collected: CollectionEntry[], cats: string[]) =>
  collected.filter((c) => {
    const s = spotById(c.spotId);
    return s && cats.includes(s.category);
  }).length;

const byRegion = (collected: CollectionEntry[], region: string) =>
  collected.filter((c) => spotById(c.spotId)?.region === region).length;

const regionTotal = (region: string) => SPOTS.filter((s) => s.region === region).length;

const seasonsCollected = (collected: CollectionEntry[]) => new Set(collected.map(entrySeason)).size;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    title: 'FIRST STEP',
    zh: '第一次留下足跡',
    zhTitle: '第一步',
    en: 'Leave your first footprint',
    icon: 'shoe-print',
    check: (c) => c.length >= 1,
    progress: (c) => ({ now: Math.min(c.length, 1), goal: 1 }),
  },
  {
    id: 'city-walker',
    title: 'CITY WALKER',
    zh: '收藏 5 個城市景點',
    zhTitle: '城市漫遊',
    en: 'Collect 5 city spots',
    icon: 'city-variant-outline',
    check: (c) => byCategory(c, ['landmark', 'culture', 'historic']) >= 5,
    progress: (c) => ({ now: Math.min(byCategory(c, ['landmark', 'culture', 'historic']), 5), goal: 5 }),
  },
  {
    id: 'mountain-soul',
    title: 'MOUNTAIN SOUL',
    zh: '收藏 3 個山岳景點',
    zhTitle: '山之魂',
    en: 'Collect 3 mountain spots',
    icon: 'image-filter-hdr',
    check: (c) => byCategory(c, ['mountain']) >= 3,
    progress: (c) => ({ now: Math.min(byCategory(c, ['mountain']), 3), goal: 3 }),
  },
  {
    id: 'island-explorer',
    title: 'ISLAND EXPLORER',
    zh: '收藏 10 個景點',
    zhTitle: '島嶼探險',
    en: 'Collect 10 spots',
    icon: 'compass-rose',
    check: (c) => c.length >= 10,
    progress: (c) => ({ now: Math.min(c.length, 10), goal: 10 }),
  },
  {
    id: 'north-complete',
    title: 'NORTH COMPLETE',
    zh: '完成北台灣收藏',
    zhTitle: '北台灣制霸',
    en: 'Complete North Taiwan',
    icon: 'city-variant',
    check: (c) => byRegion(c, 'north') >= regionTotal('north'),
    progress: (c) => ({ now: byRegion(c, 'north'), goal: regionTotal('north') }),
  },
  {
    id: 'central-complete',
    title: 'CENTRAL COMPLETE',
    zh: '完成中台灣收藏',
    zhTitle: '中台灣制霸',
    en: 'Complete Central Taiwan',
    icon: 'pine-tree',
    check: (c) => byRegion(c, 'central') >= regionTotal('central'),
    progress: (c) => ({ now: byRegion(c, 'central'), goal: regionTotal('central') }),
  },
  {
    id: 'south-complete',
    title: 'SOUTH COMPLETE',
    zh: '完成南台灣收藏',
    zhTitle: '南台灣制霸',
    en: 'Complete South Taiwan',
    icon: 'white-balance-sunny',
    check: (c) => byRegion(c, 'south') >= regionTotal('south'),
    progress: (c) => ({ now: byRegion(c, 'south'), goal: regionTotal('south') }),
  },
  {
    id: 'east-complete',
    title: 'EAST COMPLETE',
    zh: '完成東台灣收藏',
    zhTitle: '東台灣制霸',
    en: 'Complete East Taiwan',
    icon: 'waves',
    check: (c) => byRegion(c, 'east') >= regionTotal('east'),
    progress: (c) => ({ now: byRegion(c, 'east'), goal: regionTotal('east') }),
  },
  {
    id: 'four-seasons',
    title: 'FOUR SEASONS',
    zh: '春夏秋冬都留下足跡',
    zhTitle: '四季旅人',
    en: 'Collect in all four seasons',
    icon: 'sun-snowflake',
    check: (c) => seasonsCollected(c) >= SEASONS.length,
    progress: (c) => ({ now: seasonsCollected(c), goal: SEASONS.length }),
  },
  {
    id: 'taiwan-master',
    title: 'TAIWAN MASTER',
    zh: '收藏全部景點',
    zhTitle: '台灣全制霸',
    en: 'Collect every spot',
    icon: 'trophy',
    check: (c) => c.length >= SPOTS.length,
    progress: (c) => ({ now: c.length, goal: SPOTS.length }),
  },
];

export function unlockedAchievements(collected: CollectionEntry[]) {
  return ACHIEVEMENTS.filter((a) => a.check(collected));
}
