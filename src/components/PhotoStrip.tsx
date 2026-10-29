import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spot } from '../data/spots';
import { checkinRadius } from '../geo';
import { useLang, useT } from '../i18n';
import {
  cameraAvailable,
  DayPhotos,
  deletePhotoFiles,
  importPhoto,
  PHOTO_LIMIT,
  PhotoPermissionError,
  photosNear,
  photosOfDay,
  pickPhotos,
  PickedImage,
  takePhoto,
  thumbUri,
} from '../photos';
import { CollectionEntry, SpotPhoto, useStore } from '../store';
import { makeStyles, Palette, useTheme } from '../theme';
import { DayPhotoPicker } from './DayPhotoPicker';
import { PhotoViewer } from './PhotoViewer';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 8;
const TILE = Math.floor((SCREEN_W - 48 - GAP * 2) / 3);
/** How many of the newest library photos "taken near here" looks through. */
const NEAR_SCAN = 1500;

type Search = 'day' | 'near';

interface Props {
  spot: Spot;
  entry: CollectionEntry;
  /** Bump this number to open the add sheet from outside (right after the unlock moment). */
  openRequest?: number;
}

/** "My photos" under a collected spot: up to PHOTO_LIMIT tiles, an add tile, the viewer and the add sheet. */
export function PhotoStrip({ spot, entry, openRequest = 0 }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const addPhoto = useStore((s) => s.addPhoto);
  const removePhoto = useStore((s) => s.removePhoto);

  const photos = entry.photos ?? [];
  const remaining = PHOTO_LIMIT - photos.length;

  const [sheet, setSheet] = useState(false);
  const [search, setSearch] = useState<Search | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The unlock moment asks once (the strip mounts with the request already set); later adds come from the + tile.
  const lastRequest = useRef(0);
  useEffect(() => {
    if (openRequest !== lastRequest.current) {
      lastRequest.current = openRequest;
      // The parent bumps openRequest once per unlock; opening the sheet is the whole point of that signal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (remaining > 0) setSheet(true);
    }
  }, [openRequest, remaining]);

  // iOS refuses to present a picker while the sheet is still animating away, so each option
  // runs once the sheet has gone (Modal.onDismiss). Android dismisses synchronously.
  const afterSheet = useRef<(() => void) | null>(null);
  const choose = (action: () => void) => {
    if (Platform.OS === 'ios') {
      afterSheet.current = action;
      setSheet(false);
    } else {
      setSheet(false);
      action();
    }
  };
  const onSheetDismissed = () => {
    const action = afterSheet.current;
    afterSheet.current = null;
    action?.();
  };

  const checkedIn = new Date(entry.checkedInAt);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dayLabel = sameDay(checkedIn, new Date())
    ? tr('photo.today')
    : tr('photo.thatDay', {
        date: checkedIn.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'long', day: 'numeric' }),
      });

  const explain = (e: unknown) => {
    if (e instanceof PhotoPermissionError) {
      Alert.alert(tr(e.which === 'camera' ? 'photo.cameraDenied' : 'photo.photosDenied'), undefined, [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('photo.openSettings'), onPress: () => void Linking.openSettings() },
      ]);
    } else {
      Alert.alert(tr('photo.importFailed'));
    }
  };

  const store = async (picked: PickedImage[]) => {
    if (!picked.length) return;
    setBusy(true);
    try {
      const room = PHOTO_LIMIT - (useStore.getState().collections[spot.id]?.photos?.length ?? 0);
      for (const p of picked.slice(0, room)) {
        const photo = await importPhoto(spot.id, p);
        if (!addPhoto(spot.id, photo)) deletePhotoFiles(photo);
      }
    } catch (e) {
      explain(e);
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = () =>
    choose(() => {
      void (async () => {
        try {
          const p = await takePhoto();
          if (p) await store([p]);
        } catch (e) {
          explain(e);
        }
      })();
    });

  const fromLibrary = () =>
    choose(() => {
      void (async () => {
        try {
          await store(await pickPhotos(remaining));
        } catch (e) {
          explain(e);
        }
      })();
    });

  const fromThatDay = () => choose(() => setSearch('day'));
  const fromNear = () => choose(() => setSearch('near'));

  // Photos within 1.5× the check-in radius (at least 1.5 km): the spot plus the walk around it.
  const nearRadius = Math.round(checkinRadius(spot) * 1.5);
  const runSearch = (): Promise<DayPhotos> =>
    search === 'near'
      ? photosNear({ latitude: spot.latitude, longitude: spot.longitude }, nearRadius, 60, NEAR_SCAN)
      : photosOfDay(checkedIn);
  const searchTitle = search === 'near' ? tr('photo.near') : dayLabel;
  const searchEmpty = search === 'near' ? tr('photo.noneNear', { n: NEAR_SCAN }) : tr('photo.noneThatDay');

  const onDelete = (photo: SpotPhoto) => {
    removePhoto(spot.id, photo.id);
    deletePhotoFiles(photo);
    if (photos.length <= 1) setViewer(null);
    else setViewer((i) => (i === null ? null : Math.min(i, photos.length - 2)));
  };

  const openSheet = () => {
    if (remaining <= 0) {
      Alert.alert(tr('photo.full', { max: PHOTO_LIMIT }));
      return;
    }
    setSheet(true);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{tr('photo.title')}</Text>
        <Text style={styles.count}>{tr('photo.count', { n: photos.length, max: PHOTO_LIMIT })}</Text>
      </View>
      <View style={styles.row}>
        {photos.map((p, i) => (
          <Pressable key={p.id} style={styles.tile} onPress={() => setViewer(i)}>
            <Image
              source={{ uri: thumbUri(p) }}
              style={styles.tileImg}
              contentFit="cover"
              transition={120}
              recyclingKey={p.id}
            />
          </Pressable>
        ))}
        {remaining > 0 && (
          <Pressable style={[styles.tile, styles.addTile]} onPress={openSheet} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={t.accent} />
            ) : (
              <>
                <MaterialCommunityIcons name={'camera-plus-outline' as any} size={22} color={t.accent} />
                <Text style={styles.addText}>{tr('photo.add')}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* add sheet */}
      <Modal
        transparent
        visible={sheet}
        animationType="fade"
        onRequestClose={() => setSheet(false)}
        onDismiss={onSheetDismissed}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{tr('photo.prompt')}</Text>
            <Text style={styles.sheetSub}>{tr('photo.promptSub', { max: PHOTO_LIMIT })}</Text>
            {cameraAvailable() && <SheetButton icon="camera-outline" label={tr('photo.camera')} onPress={fromCamera} />}
            <SheetButton icon="calendar-today" label={dayLabel} onPress={fromThatDay} />
            <SheetButton icon="map-marker-radius-outline" label={tr('photo.near')} onPress={fromNear} />
            <SheetButton icon="image-multiple-outline" label={tr('photo.library')} onPress={fromLibrary} />
            <Pressable style={styles.later} onPress={() => setSheet(false)}>
              <Text style={styles.laterText}>{tr('photo.later')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <DayPhotoPicker
        title={searchTitle}
        emptyText={searchEmpty}
        limit={remaining}
        visible={search !== null}
        load={runSearch}
        onClose={() => setSearch(null)}
        onPick={(picked) => {
          setSearch(null);
          void store(picked);
        }}
      />

      <PhotoViewer
        photos={photos}
        index={viewer ?? 0}
        visible={viewer !== null && photos.length > 0}
        onClose={() => setViewer(null)}
        onDelete={onDelete}
      />
    </View>
  );
}

function SheetButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable style={styles.sheetBtn} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={20} color={t.text} />
      <Text style={styles.sheetBtnText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    wrap: { marginTop: 18 },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
    title: { color: t.faint, fontSize: 11, letterSpacing: 3, fontWeight: '700' },
    count: { color: t.faint, fontSize: 11, letterSpacing: 1 },
    row: { flexDirection: 'row', gap: GAP },
    tile: { width: TILE, height: TILE, borderRadius: 14, overflow: 'hidden', backgroundColor: t.card },
    tileImg: { width: '100%', height: '100%' },
    addTile: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: 'transparent',
    },
    addText: { color: t.accent, fontSize: 11, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: t.backdrop, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.bgElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 22,
    },
    sheetTitle: { color: t.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    sheetSub: { color: t.subtext, fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 16 },
    sheetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    sheetBtnText: { color: t.text, fontSize: 15, fontWeight: '600' },
    later: { alignItems: 'center', paddingVertical: 12 },
    laterText: { color: t.subtext, fontSize: 14 },
  }),
);
