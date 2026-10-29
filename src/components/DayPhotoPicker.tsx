import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import {
  DayPhoto,
  DayPhotos,
  dayPhotoToPicked,
  PhotoPermissionError,
  PickedImage,
  presentLimitedPicker,
} from '../photos';
import { makeStyles, Palette, useTheme } from '../theme';

const { width: W } = Dimensions.get('window');
const GAP = 4;
const PAD = 12;
const TILE = Math.floor((W - PAD * 2 - GAP * 2) / 3);

interface Props {
  title: string;
  /** Shown when the search finds nothing. */
  emptyText: string;
  /** How many more photos the spot can take. */
  limit: number;
  visible: boolean;
  /** Finds the candidates: photos of the check-in day, or photos taken near the spot. */
  load: () => Promise<DayPhotos>;
  onClose: () => void;
  onPick: (photos: PickedImage[]) => void;
}

type Status = 'loading' | 'ready' | 'denied' | 'error';

/** Grid of library photos from one search (a day, a place); pick up to `limit` of them. */
export function DayPhotoPicker(props: Props) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} presentationStyle="pageSheet">
      {props.visible && <Body {...props} />}
    </Modal>
  );
}

function Body({ title, emptyText, limit, load, onClose, onPick }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('loading');
  const [photos, setPhotos] = useState<DayPhoto[]>([]);
  const [limited, setLimited] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const run = async () => {
    try {
      const r = await load();
      setPhotos(r.photos);
      setLimited(r.limited);
      setStatus('ready');
    } catch (e) {
      setStatus(e instanceof PhotoPermissionError ? 'denied' : 'error');
    }
  };

  useEffect(() => {
    // run() only sets state after awaiting the media library; the sheet runs one fixed search
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < limit ? [...s, id] : s));
  };

  const confirm = () => {
    const chosen = selected.map((id) => photos.find((p) => p.id === id)).filter((p): p is DayPhoto => !!p);
    onPick(chosen.map(dayPhotoToPicked));
  };

  const widen = async () => {
    await presentLimitedPicker();
    setStatus('loading');
    await run();
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.headerBtn}>{tr('common.cancel')}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.headerBtn, { opacity: 0 }]}>{tr('common.cancel')}</Text>
      </View>

      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
          <Text style={styles.hint}>{tr('photo.loading')}</Text>
        </View>
      )}
      {status === 'denied' && (
        <View style={styles.center}>
          <MaterialCommunityIcons name={'image-off-outline' as any} size={36} color={t.faint} />
          <Text style={styles.hint}>{tr('photo.photosDenied')}</Text>
          <Pressable style={styles.linkBtn} onPress={() => void Linking.openSettings()}>
            <Text style={styles.link}>{tr('photo.openSettings')}</Text>
          </Pressable>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.hint}>{tr('photo.importFailed')}</Text>
        </View>
      )}
      {status === 'ready' && photos.length === 0 && (
        <View style={styles.center}>
          <MaterialCommunityIcons name={'image-search-outline' as any} size={36} color={t.faint} />
          <Text style={styles.hint}>{emptyText}</Text>
          {limited && (
            <Pressable style={styles.linkBtn} onPress={() => void widen()}>
              <Text style={styles.link}>{tr('photo.selectMore')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {status === 'ready' && photos.length > 0 && (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: PAD, gap: GAP }}
          columnWrapperStyle={{ gap: GAP }}
          ListHeaderComponent={
            limited ? (
              <Pressable style={styles.limitedRow} onPress={() => void widen()}>
                <Text style={styles.hint}>{tr('photo.limited')}</Text>
                <Text style={styles.link}>{tr('photo.selectMore')}</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const n = selected.indexOf(item.id);
            const picked = n >= 0;
            return (
              <Pressable onPress={() => toggle(item.id)} style={styles.tile}>
                <Image source={{ uri: item.id }} style={styles.tileImg} contentFit="cover" transition={80} recyclingKey={item.id} />
                {picked && <View style={styles.tileShade} />}
                <View style={[styles.check, picked && { backgroundColor: t.accent, borderColor: t.accent }]}>
                  {picked && <Text style={styles.checkText}>{n + 1}</Text>}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {status === 'ready' && photos.length > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.useBtn, selected.length === 0 && { opacity: 0.4 }]}
            disabled={selected.length === 0}
            onPress={confirm}
          >
            <Text style={styles.useText}>{tr('photo.use', { n: selected.length })}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.cardBorder,
    },
    headerBtn: { color: t.accent, fontSize: 15, fontWeight: '600' },
    title: { color: t.text, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    hint: { color: t.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    linkBtn: { paddingVertical: 6, paddingHorizontal: 12 },
    link: { color: t.accent, fontSize: 14, fontWeight: '700' },
    limitedRow: { alignItems: 'center', gap: 4, paddingVertical: 8, paddingBottom: 12 },
    tile: { width: TILE, height: TILE, borderRadius: 6, overflow: 'hidden', backgroundColor: t.card },
    tileImg: { width: '100%', height: '100%' },
    tileShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.25)' },
    check: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.9)',
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkText: { color: t.onAccent, fontSize: 11, fontWeight: '800' },
    footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.cardBorder },
    useBtn: { backgroundColor: t.accent, borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
    useText: { color: t.onAccent, fontSize: 15, fontWeight: '700' },
  }),
);
