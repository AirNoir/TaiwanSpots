import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Spot } from '../data/spots';
import { CollectionEntry } from '../store';
import { theme } from '../theme';
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
  const shotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  const cardW = SCREEN_W - 72;
  const dioramaSize = cardW - 48;

  const date = new Date(entry.checkedInAt);
  const dateStr = date
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase();

  const share = async () => {
    try {
      setSharing(true);
      const uri = await shotRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
          <View style={[styles.card, { width: cardW }]}>
            <Diorama spot={spot} size={dioramaSize} radius={20} />
            <Text style={styles.name}>{spot.nameEn}</Text>
            <Text style={styles.serial}>#{String(entry.order).padStart(3, '0')}</Text>
            <Text style={styles.meta}>{dateStr}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MaterialCommunityIcons
                name={'white-balance-sunny' as any}
                size={13}
                color={theme.subtext}
              />
              <Text style={[styles.meta, { marginTop: 0 }]}>{spot.city}</Text>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,9,18,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0E1626',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 24,
    alignItems: 'center',
  },
  name: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 20,
  },
  serial: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  meta: {
    color: theme.subtext,
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 1,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: theme.cardBorder,
    marginVertical: 16,
  },
  myTaiwan: {
    color: theme.faint,
    fontSize: 11,
    letterSpacing: 3,
  },
  progress: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  brand: {
    color: theme.faint,
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
    backgroundColor: theme.accent,
    paddingHorizontal: 34,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareBtnText: {
    color: '#1B1405',
    fontWeight: '700',
    fontSize: 15,
  },
  closeBtn: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  closeBtnText: {
    color: theme.subtext,
    fontSize: 15,
  },
});
