import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { seasonMeta, skyName } from '../atmosphere';
import { Spot } from '../data/spots';
import { Lang, metaLabel, spotAltName, spotName, useLang, useT } from '../i18n';
import { photoUri, saveToLibrary, thumbUri } from '../photos';
import { CollectionEntry, entrySeason, SpotPhoto } from '../store';
import { makeStyles, Palette, useTheme } from '../theme';
import { Diorama } from './Diorama';

interface Props {
  spot: Spot;
  entry: CollectionEntry;
  totalCollected: number;
  totalSpots: number;
  visible: boolean;
  onClose: () => void;
}

type Layout = 'photo' | 'model';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Cards are laid out at CARD_W points and captured at the device scale (1620 px wide on a 3x
 * iPhone) from a copy parked off screen. The one on screen is the same card scaled down.
 */
const CARD_W = 540;
const PHOTO_H = 675; // 4:5, what feeds and stories crop least

export function ShareCardModal(props: Props) {
  // The sheet mounts fresh each time it opens, so its defaults (photo card when photos exist) are current.
  return (
    <Modal transparent visible={props.visible} animationType="fade" onRequestClose={props.onClose}>
      {props.visible && <ShareSheet {...props} />}
    </Modal>
  );
}

function ShareSheet({ spot, entry, totalCollected, totalSpots, onClose }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  const shotRef = useRef<View>(null);
  const photos = entry.photos ?? [];
  const [layout, setLayout] = useState<Layout>(photos.length ? 'photo' : 'model');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [modelH, setModelH] = useState(920);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  const photo = photos[Math.min(photoIdx, photos.length - 1)];
  const effective: Layout = layout === 'photo' && photo ? 'photo' : 'model';
  const cardH = effective === 'photo' ? PHOTO_H : modelH;
  const previewW = Math.min(SCREEN_W - 56, 380, ((SCREEN_H - 300) * CARD_W) / cardH);
  const scale = previewW / CARD_W;

  const card = (
    <ShareCard
      spot={spot}
      entry={entry}
      photo={effective === 'photo' ? photo : undefined}
      totalCollected={totalCollected}
      totalSpots={totalSpots}
      lang={lang}
    />
  );

  const capture = async () => {
    const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
    if (!uri) throw new Error('capture failed');
    return uri;
  };

  // Dev automation: capture the card on screen from the Metro inspector and get the file back.
  useEffect(() => {
    if (!__DEV__) return;
    const g = globalThis as any;
    g.__islandiaShareCapture = capture;
    return () => {
      delete g.__islandiaShareCapture;
    };
  });

  const share = async () => {
    try {
      setBusy('share');
      const uri = await capture();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(tr('share.fail'), tr('share.unsupported'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
    } catch {
      Alert.alert(tr('share.fail'), tr('share.error'));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    try {
      setBusy('save');
      if (!(await saveToLibrary(await capture()))) {
        Alert.alert(tr('share.saveDenied'));
        return;
      }
      Alert.alert(tr('share.saved'));
    } catch {
      Alert.alert(tr('share.fail'), tr('share.error'));
    } finally {
      setBusy(null);
    }
  };

  return (
      <View style={styles.backdrop}>
        {/* full-size copy for the capture, parked off screen */}
        <View
          ref={shotRef}
          collapsable={false}
          onLayout={(e) => {
            if (effective === 'model') setModelH(Math.round(e.nativeEvent.layout.height));
          }}
          style={{ position: 'absolute', left: -CARD_W * 3, top: 0, width: CARD_W }}
        >
          {card}
        </View>

        {photos.length > 0 && (
          <View style={styles.toggle}>
            {(['photo', 'model'] as Layout[]).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLayout(l)}
                style={[styles.toggleBtn, effective === l && { backgroundColor: t.accent }]}
              >
                <Text style={[styles.toggleText, effective === l && { color: t.onAccent }]}>
                  {tr(l === 'photo' ? 'share.photoCard' : 'share.modelCard')}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ width: previewW, height: cardH * scale, borderRadius: 24 * scale, overflow: 'hidden' }}>
          <View style={{ width: CARD_W, transform: [{ scale }], transformOrigin: 'top left' }}>{card}</View>
        </View>

        {effective === 'photo' && photos.length > 1 && (
          <View style={styles.chips}>
            {photos.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => setPhotoIdx(i)}
                style={[styles.chip, i === photoIdx && { borderColor: t.accent }]}
              >
                <Image source={{ uri: thumbUri(p) }} style={styles.chipImg} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.shareBtn} onPress={() => void share()} disabled={busy !== null}>
            <Text style={styles.shareBtnText}>{tr(busy === 'share' ? 'share.busy' : 'share.share')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => void save()} disabled={busy !== null}>
            <Text style={styles.secondaryText}>{tr(busy === 'save' ? 'share.busy' : 'share.save')}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <Text style={styles.closeBtnText}>{tr('common.close')}</Text>
        </Pressable>
      </View>
  );
}

interface CardProps {
  spot: Spot;
  entry: CollectionEntry;
  photo?: SpotPhoto;
  totalCollected: number;
  totalSpots: number;
  lang: Lang;
}

/** The card itself, always CARD_W wide. With a photo it is a 4:5 picture card; without, the model card. */
function ShareCard({ spot, entry, photo, totalCollected, totalSpots, lang }: CardProps) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const date = new Date(entry.checkedInAt);
  const dateStr = date
    .toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', {
      month: lang === 'zh' ? 'long' : 'short',
      day: '2-digit',
      year: 'numeric',
    })
    .toUpperCase();
  const season = entrySeason(entry);
  const serial = `#${String(entry.order).padStart(3, '0')}`;

  if (photo) {
    return (
      <View style={{ width: CARD_W, height: PHOTO_H, backgroundColor: '#111111', overflow: 'hidden' }}>
        <Image
          source={{ uri: photoUri(photo), width: photo.width, height: photo.height }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 110 }}
        />
        <Text style={styles.pBrand}>{tr('share.by')}</Text>
        <View style={styles.pProgress}>
          <Text style={styles.pProgressLabel}>{tr('share.myTaiwan')}</Text>
          <Text style={styles.pProgressNum}>
            {totalCollected} / {totalSpots}
          </Text>
        </View>
        <View style={styles.pText}>
          <Text style={styles.pName} numberOfLines={2}>
            {spotName(spot, lang)}
          </Text>
          <Text style={styles.pAlt} numberOfLines={1}>
            {spotAltName(spot, lang)}
          </Text>
          <Text style={styles.pMeta} numberOfLines={1}>
            {dateStr} · {spot.city}
          </Text>
        </View>
        <View style={styles.stamp}>
          <View style={styles.stampCard}>
            <Diorama spot={spot} size={116} radius={14} atmosphere={{ season, sky: entry.sky }} />
          </View>
          <View style={[styles.stampPill, { backgroundColor: t.accent }]}>
            <Text style={[styles.stampText, { color: t.onAccent }]}>
              {tr('share.stamp')} {serial}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const variant = `${tr('spot.variant', { season: metaLabel(seasonMeta[season], lang) })}${
    entry.sky ? ` · ${skyName(entry.sky, lang)}` : ''
  }`;
  return (
    <View style={styles.card}>
      <Diorama spot={spot} size={CARD_W - 80} radius={32} atmosphere={{ season, sky: entry.sky }} />
      <Text style={styles.name}>{spotName(spot, lang)}</Text>
      <Text style={styles.nameZh}>{spotAltName(spot, lang)}</Text>
      <Text style={styles.serial}>{serial}</Text>
      <Text style={styles.meta}>{dateStr}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <MaterialCommunityIcons name={seasonMeta[season].icon as any} size={22} color={t.subtext} />
        <Text style={[styles.meta, { marginTop: 0 }]}>
          {spot.city} · {variant}
        </Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.myTaiwan}>{tr('share.myTaiwan')}</Text>
      <Text style={styles.progress}>
        {totalCollected} / {totalSpots}
      </Text>
      <Text style={styles.brand}>{tr('share.by')}</Text>
    </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.backdrop,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    toggle: {
      flexDirection: 'row',
      backgroundColor: t.card,
      borderRadius: 20,
      padding: 3,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    toggleBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 17 },
    toggleText: { color: t.subtext, fontSize: 13, fontWeight: '700' },
    chips: { flexDirection: 'row', gap: 10 },
    chip: { width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
    chipImg: { width: '100%', height: '100%' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    shareBtn: { backgroundColor: t.accent, paddingHorizontal: 34, paddingVertical: 12, borderRadius: 24 },
    shareBtnText: { color: t.onAccent, fontWeight: '700', fontSize: 15 },
    secondaryBtn: {
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    secondaryText: { color: t.text, fontSize: 15, fontWeight: '600' },
    closeBtn: { paddingVertical: 6, paddingHorizontal: 20 },
    closeBtnText: { color: t.subtext, fontSize: 15 },

    // model card, laid out at CARD_W
    card: {
      width: CARD_W,
      backgroundColor: t.bgElevated,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: t.cardBorder,
      padding: 40,
      alignItems: 'center',
    },
    name: { color: t.text, fontSize: 36, fontWeight: '800', letterSpacing: 3, marginTop: 32, textAlign: 'center' },
    nameZh: { color: t.subtext, fontSize: 24, marginTop: 4 },
    serial: { color: t.accent, fontSize: 23, fontWeight: '700', letterSpacing: 3, marginTop: 10 },
    meta: { color: t.subtext, fontSize: 21, marginTop: 10, letterSpacing: 1.5 },
    divider: { width: 80, height: 2, backgroundColor: t.cardBorder, marginVertical: 26 },
    myTaiwan: { color: t.faint, fontSize: 18, letterSpacing: 5 },
    progress: { color: t.text, fontSize: 30, fontWeight: '700', marginTop: 6 },
    brand: { color: t.faint, fontSize: 18, marginTop: 26, fontStyle: 'italic' },

    // photo card, CARD_W × PHOTO_H
    pBrand: {
      position: 'absolute',
      left: 30,
      top: 28,
      color: 'rgba(255,255,255,0.92)',
      fontSize: 16,
      fontStyle: 'italic',
      letterSpacing: 1,
    },
    pProgress: { position: 'absolute', right: 30, top: 24, alignItems: 'flex-end' },
    pProgressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: 3, fontWeight: '700' },
    pProgressNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
    pText: { position: 'absolute', left: 32, right: 200, bottom: 36 },
    pName: {
      color: '#FFFFFF',
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: 1,
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    pAlt: { color: 'rgba(255,255,255,0.88)', fontSize: 20, marginTop: 4, letterSpacing: 1 },
    pMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12, letterSpacing: 1.5 },
    stamp: { position: 'absolute', right: 28, bottom: 34, alignItems: 'center', transform: [{ rotate: '-5deg' }] },
    stampCard: {
      padding: 8,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    stampPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginTop: -12 },
    stampText: { fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  }),
);
