import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaiwanMap } from '../src/components/TaiwanMap';
import { useStore } from '../src/store';
import { theme } from '../src/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const PAGES = [
  {
    key: 'intro',
    icon: null as string | null,
    title: '走過的地方,\n都會留在你的世界。',
    body: 'Islandia 是一座由真實旅行\n建立起來的微縮台灣。',
  },
  {
    key: 'arrive',
    icon: 'compass-rose',
    title: '抵達景點',
    body: '真的去到那裡。',
  },
  {
    key: 'checkin',
    icon: 'shoe-print',
    title: '留下足跡',
    body: '解鎖專屬微縮場景。',
  },
  {
    key: 'build',
    icon: 'island',
    title: '建立你的台灣',
    body: '每趟旅行,都讓世界更完整。',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setOnboarded = useStore((s) => s.setOnboarded);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const start = async () => {
    await Location.requestForegroundPermissionsAsync();
    setOnboarded();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
      >
        {PAGES.map((p) => (
          <View key={p.key} style={styles.page}>
            {p.icon ? (
              <View style={styles.pageIcon}>
                <MaterialCommunityIcons name={p.icon as any} size={72} color={theme.accent} />
              </View>
            ) : (
              <View style={{ marginBottom: 32 }}>
                <TaiwanMap
                  width={SCREEN_W * 0.56}
                  height={SCREEN_W * 0.72}
                  collectedIds={new Set(['taipei-101', 'jiufen', 'sun-moon-lake', 'kenting', 'taroko', 'alishan'])}
                  interactive={false}
                />
              </View>
            )}
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body}>{p.body}</Text>
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
            <Text style={styles.ctaText}>開始探索</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.next}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: (page + 1) * SCREEN_W, animated: true });
              setPage(page + 1);
            }}
          >
            <Text style={styles.nextText}>下一步</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  body: {
    color: theme.subtext,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  footer: { paddingHorizontal: 32, paddingBottom: 24, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.locked },
  dotActive: { backgroundColor: theme.accent, width: 20 },
  cta: {
    backgroundColor: theme.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaText: { color: '#1B1405', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  next: {
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 28,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextText: { color: theme.text, fontSize: 16, fontWeight: '600' },
});
