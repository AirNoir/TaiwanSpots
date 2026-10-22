import { getLocales } from 'expo-localization';
import { useCallback } from 'react';
import type { Spot } from './data/spots';
import { useStore } from './store';

/**
 * UI languages. Traditional Chinese is the product's own voice; English is
 * for visitors. 'auto' follows the phone: any Chinese locale → zh, else en.
 * Spot descriptions exist only in Chinese for now and show as-is in English.
 */
export type Lang = 'zh' | 'en';
export type LangPref = 'auto' | Lang;

const zh = {
  // tabs
  'tab.world': '世界',
  'tab.explore': '探索',
  'tab.passport': '護照',
  'tab.me': '我的',

  // home
  'home.greet.night': '夜深了。',
  'home.greet.morning': '早安。',
  'home.greet.afternoon': '午安。',
  'home.greet.evening': '晚安。',
  'home.tagline': '去過的地方，會成為你的世界。',
  'home.day': '天',
  'home.night': '夜',
  'home.loc.title': '定位還沒開啟',
  'home.loc.body': '收藏景點需要知道你真的在那裡。距離暫時以台北車站估算。',
  'home.loc.settings': '開啟設定',
  'home.world': '我的台灣世界',
  'home.explored': '已探索',
  'home.nextStop': '下一站',
  'home.next.ready': '你已抵達 · 現在就能收藏',
  'home.next.fallback': '離台北車站最近的景點',
  'home.next.closest': '離你最近、還沒收藏',
  'home.next.collect': '去收藏',
  'home.next.view': '看看',
  'home.next.navigate': '導航',
  'home.next.a11yView': '查看下一站 {name}',
  'home.next.a11yCollect': '去收藏下一站 {name}',
  'home.next.a11yNav': '導航到 {name}',
  'home.alsoNear': '附近還有',
  'home.latest': '最近收藏',
  'home.cta': '探索附近景點',
  'common.collectable': '可收藏',

  // explore
  'explore.title': '探索',
  'explore.loc.demo': '模擬位置',
  'explore.loc.fallback': '預設位置（台北車站）',
  'explore.loc.here': '目前位置',
  'explore.search': '搜尋景點、城市',
  'explore.all': '全部',
  'explore.todo': '未收藏',
  'explore.done': '已收藏',
  'explore.count': '{n} 個景點',
  'explore.emptyDone': '這裡全部收藏了！',
  'explore.emptyNone': '找不到符合的景點',

  // passport
  'passport.kicker': '我的護照',
  'passport.country': '台灣',
  'passport.onlyRegion': '只看{region}，{got}/{total}',
  'passport.filterNote': '只顯示{region} · 顯示全部',

  // me
  'me.places': '景點',
  'me.cities': '縣市',
  'me.journey': '公里旅程',
  'me.achievements': '成就',
  'me.appearance': '外觀',
  'me.language': '語言',
  'me.lang.auto': '跟隨手機',
  'me.theme.light': '淺色',
  'me.theme.dark': '深色',
  'me.rankNext': '再收藏 {n} 個，成為「{rank}」',
  'me.reset': '重置示範資料',
  'me.reset.title': '重置示範資料？',
  'me.reset.body': '會清除所有收藏並回到開場導覽，無法復原。',
  'me.reset.confirm': '重置',
  'common.cancel': '取消',
  'me.footer': '金錢能讓你的世界更漂亮，\n只有旅行能讓它更大。',

  // spot
  'spot.notFound': '找不到這個景點',
  'spot.backToMap': '回到地圖',
  'spot.zoom': '放大檢視 {name}',
  'spot.day': '日',
  'spot.night': '夜',
  'spot.collected': '已收藏',
  'spot.variant': '{season}季版本',
  'spot.share': '分享收藏卡',
  'spot.revisit': '導航再訪',
  'spot.noLocation': '開啟定位，才能知道你離這裡多遠',
  'spot.distance': '距離你 {d}',
  'spot.arrived': '● 你已抵達收藏範圍',
  'spot.needRange': '需進入 {d} 範圍內才能收藏',
  'spot.checkIn': '留下足跡',
  'spot.walk': '步行導航',
  'spot.drive': '開車導航',
  'spot.demoTeleport': '示範・模擬抵達這裡',
  'spot.around': '順路還有',
  'spot.aroundDist': '相距 {d}',
  'spot.aroundA11y': '{name}，距離這裡 {d}',

  // map
  'map.allTaiwan': '全台灣',
  'map.back': '返回{place}',
  'map.collectedOf': '{found} / {total} 已收藏',
  'map.chipA11y': '{region}，已收藏 {found} / {total}',
  'map.hint': '點一個區域，看看那裡有哪些景點',
  'map.hintLeft': '數字是還沒收藏的景點數，點一下去看看',
  'map.leftA11y': '還有 {n} 個未收藏',
  'map.todoOnly': '只看未收藏',
  'map.strip.todo': '{place} · 還有 {n} 個景點等你收藏',
  'map.strip.done': '{place} · 全部收藏了',
  'map.got': '已收藏',
  'map.gotMark': '✓ 已收藏',
  'map.notYet': '尚未收藏',
  'map.view': '查看{name}',
  'map.nextStop': '下一站',

  // unlock / share / viewer
  'unlock.new': '新地標',
  'unlock.progress': '第 {n} 個景點 · {county} {got}/{total}',
  'unlock.complete': ' 全收齊！',
  'unlock.add': '加入收藏',
  'share.myTaiwan': '我的台灣',
  'share.by': '由 Islandia 收藏',
  'share.fail': '無法分享',
  'share.unsupported': '這台裝置不支援分享圖片。',
  'share.error': '收藏卡產生失敗，請再試一次。',
  'share.busy': '處理中…',
  'share.share': '分享',
  'common.close': '關閉',
  'viewer.hint': '雙指縮放・點兩下放大・往下滑關閉',

  // maps
  'maps.navigateTo': '導航到 {name}',
  'maps.apple': 'Apple 地圖',
  'maps.google': 'Google 地圖',

  // onboarding
  'onb.1.title': '走過的地方，\n都會留在你的世界。',
  'onb.1.body': 'Islandia 是一座由真實旅行\n建立起來的微縮台灣。',
  'onb.2.title': '抵達景點',
  'onb.2.body': '真的去到那裡。',
  'onb.3.title': '留下足跡',
  'onb.3.body': '解鎖專屬微縮場景。',
  'onb.4.title': '建立你的台灣',
  'onb.4.body': '每趟旅行，都讓世界更完整。',
  'onb.start': '開始探索',
  'onb.next': '下一步',
} as const;

export type I18nKey = keyof typeof zh;

const en: Record<I18nKey, string> = {
  'tab.world': 'WORLD',
  'tab.explore': 'EXPLORE',
  'tab.passport': 'PASSPORT',
  'tab.me': 'ME',

  'home.greet.night': 'Good night.',
  'home.greet.morning': 'Good morning.',
  'home.greet.afternoon': 'Good afternoon.',
  'home.greet.evening': 'Good evening.',
  'home.tagline': 'Where you have been becomes your world.',
  'home.day': '',
  'home.night': ' night',
  'home.loc.title': 'Location is off',
  'home.loc.body': 'Collecting needs to know you are really there. Distances are estimated from Taipei Main Station.',
  'home.loc.settings': 'Settings',
  'home.world': 'MY TAIWAN WORLD',
  'home.explored': 'EXPLORED',
  'home.nextStop': 'NEXT STOP',
  'home.next.ready': 'You are here · collect it now',
  'home.next.fallback': 'Closest to Taipei Main Station',
  'home.next.closest': 'Closest one you have not collected',
  'home.next.collect': 'Collect',
  'home.next.view': 'View',
  'home.next.navigate': 'Directions',
  'home.next.a11yView': 'View next stop {name}',
  'home.next.a11yCollect': 'Collect next stop {name}',
  'home.next.a11yNav': 'Directions to {name}',
  'home.alsoNear': 'ALSO NEAR YOU',
  'home.latest': 'YOUR LATEST',
  'home.cta': 'Explore Nearby',
  'common.collectable': 'In range',

  'explore.title': 'EXPLORE',
  'explore.loc.demo': 'Simulated location',
  'explore.loc.fallback': 'Default location (Taipei Main Station)',
  'explore.loc.here': 'Current location',
  'explore.search': 'Search spots or cities',
  'explore.all': 'All',
  'explore.todo': 'To collect',
  'explore.done': 'Collected',
  'explore.count': '{n} spots',
  'explore.emptyDone': 'All collected here!',
  'explore.emptyNone': 'No matching spots',

  'passport.kicker': 'MY PASSPORT',
  'passport.country': 'TAIWAN',
  'passport.onlyRegion': 'Only {region}, {got}/{total}',
  'passport.filterNote': 'Showing {region} only · Show all',

  'me.places': 'Places',
  'me.cities': 'Cities',
  'me.journey': 'km Journey',
  'me.achievements': 'ACHIEVEMENTS',
  'me.appearance': 'APPEARANCE',
  'me.language': 'LANGUAGE',
  'me.lang.auto': 'Phone',
  'me.theme.light': 'Light',
  'me.theme.dark': 'Dark',
  'me.rankNext': '{n} more to become “{rank}”',
  'me.reset': 'Reset demo data',
  'me.reset.title': 'Reset demo data?',
  'me.reset.body': 'Clears every collection and returns to the intro. This cannot be undone.',
  'me.reset.confirm': 'Reset',
  'common.cancel': 'Cancel',
  'me.footer': 'Money can make your world prettier.\nBut only travel can make it bigger.',

  'spot.notFound': 'Spot not found',
  'spot.backToMap': 'Back to map',
  'spot.zoom': 'Zoom into {name}',
  'spot.day': ' day',
  'spot.night': ' night',
  'spot.collected': 'COLLECTED',
  'spot.variant': '{season} VARIANT',
  'spot.share': 'Share card',
  'spot.revisit': 'Directions',
  'spot.noLocation': 'Turn on location to see how far you are',
  'spot.distance': '{d} away',
  'spot.arrived': '● You are within range',
  'spot.needRange': 'Get within {d} to collect',
  'spot.checkIn': 'Collect',
  'spot.walk': 'Walking directions',
  'spot.drive': 'Driving directions',
  'spot.demoTeleport': 'DEMO · Pretend I am here',
  'spot.around': 'NEARBY',
  'spot.aroundDist': '{d} apart',
  'spot.aroundA11y': '{name}, {d} from here',

  'map.allTaiwan': 'Taiwan',
  'map.back': 'Back to {place}',
  'map.collectedOf': '{found} / {total} collected',
  'map.chipA11y': '{region}, {found} of {total} collected',
  'map.hint': 'Tap a region to see its spots',
  'map.hintLeft': 'Numbers show spots still to collect — tap to look',
  'map.leftA11y': '{n} still to collect',
  'map.todoOnly': 'To collect',
  'map.strip.todo': '{place} · {n} spots left to collect',
  'map.strip.done': '{place} · all collected',
  'map.got': 'Collected',
  'map.gotMark': '✓ Collected',
  'map.notYet': 'Not collected',
  'map.view': 'View {name}',
  'map.nextStop': 'NEXT STOP',

  'unlock.new': 'NEW LANDMARK',
  'unlock.progress': 'Spot #{n} · {county} {got}/{total}',
  'unlock.complete': ' complete!',
  'unlock.add': 'Add to collection',
  'share.myTaiwan': 'MY TAIWAN',
  'share.by': 'collected with Islandia',
  'share.fail': 'Cannot share',
  'share.unsupported': 'This device cannot share images.',
  'share.error': 'Could not make the card. Please try again.',
  'share.busy': 'Working…',
  'share.share': 'Share',
  'common.close': 'Close',
  'viewer.hint': 'Pinch to zoom · double-tap · swipe down to close',

  'maps.navigateTo': 'Directions to {name}',
  'maps.apple': 'Apple Maps',
  'maps.google': 'Google Maps',

  'onb.1.title': 'Every place you go\nstays in your world.',
  'onb.1.body': 'Islandia is a miniature Taiwan\nbuilt from real journeys.',
  'onb.2.title': 'Arrive',
  'onb.2.body': 'Really go there.',
  'onb.3.title': 'Leave a footprint',
  'onb.3.body': 'Unlock its miniature diorama.',
  'onb.4.title': 'Build your Taiwan',
  'onb.4.body': 'Every trip makes the world more complete.',
  'onb.start': 'Start exploring',
  'onb.next': 'Next',
};

const DICT: Record<Lang, Record<I18nKey, string>> = { zh, en };

export function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === 'zh' ? 'zh' : 'en';
}

export const resolveLang = (pref: LangPref): Lang => (pref === 'auto' ? deviceLang() : pref);

export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>) {
  const s = DICT[lang][key] ?? zh[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s;
}

export function useLang(): Lang {
  return resolveLang(useStore((s) => s.language));
}

/** `const t = useT(); t('home.nextStop')`, with `{name}`-style variables. */
export function useT() {
  const lang = useLang();
  return useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
}

/** Name of a spot in the UI language, and the other-language name as its subtitle. */
export const spotName = (s: Spot, lang: Lang) => (lang === 'zh' ? s.name : s.nameEn);
export const spotAltName = (s: Spot, lang: Lang) => (lang === 'zh' ? s.nameEn : s.name);

/** Label of a meta entry that carries both an English `label` and a Chinese `zh`. */
export const metaLabel = (m: { label: string; zh: string }, lang: Lang) => (lang === 'zh' ? m.zh : m.label);

// County (縣市) names as they appear in spot.city, for the English map.
const COUNTY_EN: Record<string, string> = {
  台北: 'Taipei',
  新北: 'New Taipei',
  基隆: 'Keelung',
  桃園: 'Taoyuan',
  新竹: 'Hsinchu',
  苗栗: 'Miaoli',
  台中: 'Taichung',
  彰化: 'Changhua',
  南投: 'Nantou',
  雲林: 'Yunlin',
  嘉義: 'Chiayi',
  台南: 'Tainan',
  高雄: 'Kaohsiung',
  屏東: 'Pingtung',
  宜蘭: 'Yilan',
  花蓮: 'Hualien',
  台東: 'Taitung',
};

export const countyLabel = (county: string, lang: Lang) => (lang === 'zh' ? county : (COUNTY_EN[county] ?? county));

/** Rough rendered width of a short label at ~10 pt bold, for collision checks. */
export const labelWidth = (text: string) =>
  Array.from(text).reduce((w, ch) => w + (/[⺀-鿿＀-￯]/.test(ch) ? 10.5 : 6.2), 10);
