import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang, useT } from '../i18n';
import { photoUri } from '../photos';
import { SpotPhoto } from '../store';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  photos: SpotPhoto[];
  /** Which photo opens first. */
  index: number;
  visible: boolean;
  onClose: () => void;
  onDelete: (photo: SpotPhoto) => void;
}

/** Full-screen pager over a spot's photos: swipe between them, delete the one on screen. */
export function PhotoViewer({ photos, index, visible, onClose, onDelete }: Props) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {visible && <Pager photos={photos} index={index} onClose={onClose} onDelete={onDelete} />}
    </Modal>
  );
}

function Pager({ photos, index, onClose, onDelete }: Omit<Props, 'visible'>) {
  const tr = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(Math.min(index, Math.max(photos.length - 1, 0)));
  const photo = photos[Math.min(current, photos.length - 1)];
  if (!photo) return null;

  const when = new Date(photo.takenAt ?? photo.addedAt).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const confirmDelete = () => {
    Alert.alert(tr('photo.deleteConfirm'), tr('photo.deleteSub'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('photo.delete'), style: 'destructive', onPress: () => onDelete(photo) },
    ]);
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={current}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        keyExtractor={(p) => p.id}
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={{ width: W, height: H, justifyContent: 'center' }}>
            <Image
              source={{ uri: photoUri(item), width: item.width, height: item.height }}
              style={{ width: W, height: H }}
              contentFit="contain"
              transition={120}
            />
          </View>
        )}
      />
      <View style={[styles.bar, { top: insets.top + 6 }]}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
          <MaterialCommunityIcons name={'close' as any} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.counter}>
          {Math.min(current, photos.length - 1) + 1} / {photos.length}
        </Text>
        <Pressable onPress={confirmDelete} hitSlop={12} style={styles.iconBtn}>
          <MaterialCommunityIcons name={'trash-can-outline' as any} size={22} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={[styles.when, { bottom: insets.bottom + 18 }]}>{when}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  counter: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  when: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    letterSpacing: 1,
  },
});
