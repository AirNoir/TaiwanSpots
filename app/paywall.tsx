import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesStoreProduct } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diorama } from '../src/components/Diorama';
import { spotById, SPOTS } from '../src/data/spots';
import { DEMO_TOOLS } from '../src/demo';
import { FREE_LIMIT, sealedList, useHasFull, withUnseal } from '../src/entitlements';
import { useT } from '../src/i18n';
import { buy, loadFullProduct, purchasesAvailable, restore } from '../src/purchases';
import { useStore } from '../src/store';
import { makeStyles, Palette, useTheme } from '../src/theme';

// Paywall (docs/spec.md §3.3): opened from the first sealed collection, any sealed
// model, and the Me tab. Never pops up on its own anywhere else.

const PRIVACY_URL = 'https://github.com/AirNoir/TaiwanSpots/blob/main/docs/privacy.md';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PREVIEW = 8;

export default function PaywallScreen() {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const router = useRouter();
  const full = useHasFull();
  const collections = useStore((s) => s.collections);
  const sealed = useMemo(() => sealedList(collections, full), [collections, full]);

  const [product, setProduct] = useState<PurchasesStoreProduct | null>(null);
  const [loading, setLoading] = useState(purchasesAvailable);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!purchasesAvailable) return;
    let alive = true;
    loadFullProduct().then((p) => {
      if (!alive) return;
      setProduct(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // the paywall makes way for the "all open" moment
  const finish = (unseal: boolean) => (unseal ? router.replace('/unseal') : close());

  const onBuy = async () => {
    if (busy) return;
    // Expo Go and builds without a store key: demo builds simulate the purchase.
    if (!product) {
      if (DEMO_TOOLS) {
        const [, unseal] = await withUnseal(async () => useStore.getState().setSimulatedFull(true));
        finish(unseal);
      }
      return;
    }
    setBusy(true);
    const [result, unseal] = await withUnseal(() => buy(product));
    setBusy(false);
    if (result === 'bought') finish(unseal);
    else if (result === 'failed') Alert.alert(tr('purchase.failed'));
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    const [result, unseal] = await withUnseal(restore);
    setBusy(false);
    if (result === 'restored') {
      if (unseal) finish(true);
      else {
        Alert.alert(tr('restore.done'));
        close();
      }
    } else Alert.alert(tr(result === 'nothing' ? 'restore.nothing' : 'restore.failed'));
  };

  const canBuy = !!product || DEMO_TOOLS;
  const preview = sealed.slice(0, PREVIEW).map(spotById).filter((s) => !!s);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('paywall.close')}>
          <Ionicons name="close" size={26} color={t.subtext} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={'package-variant' as any} size={34} color={t.accent} />
        </View>
        <Text style={styles.kicker}>{tr('paywall.title')}</Text>
        <Text style={styles.headline}>
          {full
            ? tr('me.fullOwned')
            : sealed.length
              ? tr('paywall.sealed', { n: sealed.length })
              : tr('paywall.free', { limit: FREE_LIMIT })}
        </Text>

        {preview.length > 0 && (
          <View style={styles.grid}>
            {preview.map((s) => (
              <Diorama key={s.id} spot={s} size={68} radius={14} sealed />
            ))}
            {sealed.length > PREVIEW && (
              <View style={styles.more}>
                <Text style={styles.moreText}>+{sealed.length - PREVIEW}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.body}>{tr('paywall.body', { total: SPOTS.length })}</Text>

        {full ? (
          <View style={styles.owned}>
            <MaterialCommunityIcons name={'check-decagram' as any} size={18} color={t.success} />
            <Text style={styles.ownedText}>{tr('paywall.owned')}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canBuy && styles.buyBtnOff]}
            onPress={onBuy}
            disabled={!canBuy || busy || loading}
            accessibilityRole="button"
          >
            {busy || loading ? (
              <ActivityIndicator color={t.onAccent} />
            ) : (
              <Text style={[styles.buyText, !canBuy && { color: t.faint }]}>
                {product ? tr('paywall.buy', { price: product.priceString }) : tr('paywall.buyNoPrice')}
              </Text>
            )}
          </Pressable>
        )}
        {!full && !loading && !canBuy && <Text style={styles.note}>{tr('paywall.unavailable')}</Text>}

        <Pressable onPress={onRestore} disabled={busy} hitSlop={8} style={styles.restore} accessibilityRole="button">
          <Text style={styles.restoreText}>{tr('paywall.restore')}</Text>
        </Pressable>

        <View style={styles.legal}>
          <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={6} accessibilityRole="link">
            <Text style={styles.legalText}>{tr('paywall.privacy')}</Text>
          </Pressable>
          <Text style={styles.legalText}>·</Text>
          <Pressable onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={6} accessibilityRole="link">
            <Text style={styles.legalText}>{tr('paywall.terms')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bgElevated },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
    container: { paddingHorizontal: 28, paddingBottom: 40, alignItems: 'center' },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    kicker: { color: t.accent, fontSize: 13, fontWeight: '700', letterSpacing: 3, marginTop: 18 },
    headline: { color: t.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 8, lineHeight: 32 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 22 },
    more: {
      width: 68,
      height: 68,
      borderRadius: 14,
      backgroundColor: t.sealedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreText: { color: t.subtext, fontSize: 16, fontWeight: '700' },
    body: { color: t.subtext, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 22 },
    buyBtn: {
      alignSelf: 'stretch',
      backgroundColor: t.accent,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 28,
    },
    buyBtnOff: { backgroundColor: t.locked },
    buyText: { color: t.onAccent, fontSize: 17, fontWeight: '800' },
    note: { color: t.faint, fontSize: 13, textAlign: 'center', marginTop: 10 },
    owned: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
    ownedText: { color: t.success, fontSize: 16, fontWeight: '700' },
    restore: { marginTop: 18, padding: 6 },
    restoreText: { color: t.subtext, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
    legal: { flexDirection: 'row', gap: 8, marginTop: 22 },
    legalText: { color: t.faint, fontSize: 12 },
  }),
);
