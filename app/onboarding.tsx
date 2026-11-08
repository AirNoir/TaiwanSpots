import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logEvent } from '../src/analytics';
import { TaiwanWorld } from '../src/components/TaiwanWorld';
import { useStore } from '../src/store';
import { makeStyles, Palette, useTheme } from '../src/theme';
import { I18nKey, useT } from '../src/i18n';


const PAGES = [
  {
    key: 'intro',
    icon: null as string | null,
    title: 'onb.1.title' as I18nKey,
    body: 'onb.1.body' as I18nKey,
  },
  {
    key: 'arrive',
    icon: 'compass-rose',
    title: 'onb.2.title' as I18nKey,
    body: 'onb.2.body' as I18nKey,
  },
  {
    key: 'checkin',
    icon: 'shoe-print',
    title: 'onb.3.title' as I18nKey,
    body: 'onb.3.body' as I18nKey,
  },
  {
    key: 'build',
    icon: 'island',
    title: 'onb.4.title' as I18nKey,
    body: 'onb.4.body' as I18nKey,
  },
];

export default function OnboardingScreen() {
  const t = useTheme();
  const tr = useT();
  const styles = useStyles();
  const router = useRouter();
  const setOnboarded = useStore((s) => s.setOnboarded);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const window = useWindowDimensions();
  // Pages are as wide as the pager itself, measured, so paging stays right after a resize
  // (iPad Split View, iPhone Duo folding).
  const [pageW, setPageW] = useState(window.width);
  // The intro map is ~1.7× taller than wide; leave room for the copy and buttons on short
  // screens (SE: 667 pt, the iPhone Duo outer display) and don't let it sprawl on iPad.
  const introMapW = Math.min(pageW * 0.56, (window.height - 380) / 1.7, 420);

  const starting = useRef(false);
  const start = async () => {
    if (starting.current) return; // a double tap would ask twice and navigate twice
    starting.current = true;
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // the app works without location (no check-ins); never trap the user on this page
    }
    setOnboarded();
    logEvent('onboarding_done');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setPageW(w);
          scrollRef.current?.scrollTo({ x: page * w, animated: false });
        }}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))
        }
      >
        {PAGES.map((p) => (
          <View key={p.key} style={[styles.page, { width: pageW }]}>
            {p.icon ? (
              <View style={styles.pageIcon}>
                <MaterialCommunityIcons name={p.icon as any} size={72} color={t.accent} />
              </View>
            ) : (
              <View style={{ marginBottom: 32 }}>
                <TaiwanWorld
                  width={introMapW}
                  collectedIds={new Set(['taipei-101', 'jiufen', 'sun-moon-lake', 'kenting', 'taroko', 'alishan'])}
                  interactive={false}
                />
              </View>
            )}
            <Text style={styles.title}>{tr(p.title)}</Text>
            <Text style={styles.body}>{tr(p.body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {page === PAGES.length - 1 ? (
          <Pressable style={styles.cta} onPress={start}>
            <Text style={styles.ctaText}>{tr('onb.start')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.next}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: (page + 1) * pageW, animated: true });
              setPage(page + 1);
            }}
          >
            <Text style={styles.nextText}>{tr('onb.next')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    color: t.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  body: {
    color: t.subtext,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  footer: { paddingHorizontal: 32, paddingBottom: 24, alignItems: 'center', width: '100%', maxWidth: 520, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.locked },
  dotActive: { backgroundColor: t.accent, width: 20 },
  cta: {
    backgroundColor: t.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaText: { color: t.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  next: {
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 28,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextText: { color: t.text, fontSize: 16, fontWeight: '600' },
  }),
);
