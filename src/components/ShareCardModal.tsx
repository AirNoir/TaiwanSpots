import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { seasonMeta, skyMeta } from '../atmosphere';
import { Spot } from '../data/spots';
import { CollectionEntry, entrySeason } from '../store';
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

const { width: SCREEN_W } = Dimensions.get('window');

export function ShareCardModal({ spot, entry, totalCollected, totalSpots, visible, onClose }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const shotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  const cardW = SCREEN_W - 72;
  const dioramaSize = cardW - 48;

  const date = new Date(entry.checkedInAt);
  const dateStr = date
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase();
  const season = entrySeason(entry);
  const variant = `${seasonMeta[season].label}${entry.sky ? ` · ${skyMeta[entry.sky].zh}` : ''}`;

  const share = async () => {
    try {
      setSharing(true);
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('無法分享', '這台裝置不支援分享圖片。');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      Alert.alert('無法分享', '收藏卡產生失敗，請再試一次。');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
          <View style={[styles.card, { width: cardW }]}>
            <Diorama spot={spot} size={dioramaSize} radius={20} atmosphere={{ season, sky: entry.sky }} />
            <Text style={styles.name}>{spot.nameEn}</Text>
            <Text style={styles.serial}>#{String(entry.order).padStart(3, '0')}</Text>
            <Text style={styles.meta}>{dateStr}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MaterialCommunityIcons
                name={seasonMeta[season].icon as any}
                size={13}
                color={t.subtext}
              />
              <Text style={[styles.meta, { marginTop: 0 }]}>
                {spot.city} · {variant}
              </Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.myTaiwan}>MY TAIWAN</Text>
            <Text style={styles.progress}>
              {totalCollected} / {totalSpots}
            </Text>
            <Text style={styles.brand}>collected with Islandia</Text>
          </View>
        </ViewShot>

        <View style={styles.actions}>
          <Pressable style={styles.shareBtn} onPress={share} disabled={sharing}>
            <Text style={styles.shareBtnText}>{sharing ? '處理中…' : '分享'}</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>關閉</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: t.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: t.bgElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 24,
    alignItems: 'center',
  },
  name: {
    color: t.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 20,
  },
  serial: {
    color: t.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  meta: {
    color: t.subtext,
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 1,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: t.cardBorder,
    marginVertical: 16,
  },
  myTaiwan: {
    color: t.faint,
    fontSize: 11,
    letterSpacing: 3,
  },
  progress: {
    color: t.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  brand: {
    color: t.faint,
    fontSize: 11,
    marginTop: 16,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
  },
  shareBtn: {
    backgroundColor: t.accent,
    paddingHorizontal: 34,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareBtnText: {
    color: t.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  closeBtn: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  closeBtnText: {
    color: t.subtext,
    fontSize: 15,
  },
  }),
);
