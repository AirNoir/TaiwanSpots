import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { distanceMeters, LatLng } from './geo';
import { PHOTO_LIMIT, SpotPhoto } from './store';

/**
 * The camera, picker and library modules load on first use, not at startup: nothing on the
 * home screen needs them, and loading them early risked the photo-library prompt before
 * anyone asked for a photo.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const mediaLibrary = (): typeof import('expo-media-library') => require('expo-media-library');
const imagePicker = (): typeof import('expo-image-picker') => require('expo-image-picker');
const imageManipulator = (): typeof import('expo-image-manipulator') => require('expo-image-manipulator');
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Photos a traveller attaches to a collected spot (docs/spec.md §10).
 * They live on the phone only: <documentDirectory>/photos/<spotId>/<id>.jpg
 * plus a small <id>.t.jpg for lists. Every file is re-encoded here, so
 * nothing we keep or share carries the original EXIF (and its GPS).
 */
export { PHOTO_LIMIT };

const FULL_EDGE = 1920;
const THUMB_EDGE = 480;
const FULL_QUALITY = 0.85;
const THUMB_QUALITY = 0.8;

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  /** ISO 8601, when known (camera: now; library: the asset's creation time). */
  takenAt?: string;
}

export class PhotoPermissionError extends Error {
  constructor(public readonly which: 'camera' | 'photos') {
    super(`${which} permission denied`);
  }
}

const spotDir = (spotId: string) => new Directory(Paths.document, 'photos', spotId);
const thumbName = (file: string) => file.replace(/\.jpg$/, '.t.jpg');

export const photoUri = (p: SpotPhoto): string => new File(Paths.document, p.file).uri;
export const thumbUri = (p: SpotPhoto): string => new File(Paths.document, thumbName(p.file)).uri;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** JPEG with the long side capped at `edge` px. The result is a fresh bitmap: no metadata survives. */
async function encode(src: PickedImage, edge: number, quality: number) {
  const { ImageManipulator, SaveFormat } = imageManipulator();
  const ctx = ImageManipulator.manipulate(src.uri);
  if (src.width > 0 && src.height > 0 && Math.max(src.width, src.height) > edge) {
    ctx.resize(src.width >= src.height ? { width: edge } : { height: edge });
  }
  const ref = await ctx.renderAsync();
  try {
    return await ref.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  } finally {
    ref.release();
  }
}

/** Stores a picked image for a spot and returns the record to keep in the passport. */
export async function importPhoto(spotId: string, src: PickedImage): Promise<SpotPhoto> {
  const dir = spotDir(spotId);
  dir.create({ idempotent: true, intermediates: true });
  const id = newId();
  const full = await encode(src, FULL_EDGE, FULL_QUALITY);
  const thumb = await encode({ uri: full.uri, width: full.width, height: full.height }, THUMB_EDGE, THUMB_QUALITY);
  new File(full.uri).move(new File(dir, `${id}.jpg`));
  new File(thumb.uri).move(new File(dir, `${id}.t.jpg`));
  return {
    id,
    file: `photos/${spotId}/${id}.jpg`,
    width: full.width,
    height: full.height,
    takenAt: src.takenAt,
    addedAt: new Date().toISOString(),
  };
}

export function deletePhotoFiles(p: SpotPhoto): void {
  for (const f of [new File(Paths.document, p.file), new File(Paths.document, thumbName(p.file))]) {
    try {
      if (f.exists) f.delete();
    } catch {
      // a missing file is already what we want
    }
  }
}

export async function takePhoto(): Promise<PickedImage | null> {
  const ImagePicker = imagePicker();
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new PhotoPermissionError('camera');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false });
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  return { uri: a.uri, width: a.width, height: a.height, takenAt: new Date().toISOString() };
}

/** The system picker runs out of process on iOS, so it needs no photo-library permission. */
export async function pickPhotos(limit: number): Promise<PickedImage[]> {
  const res = await imagePicker().launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });
  if (res.canceled || !res.assets) return [];
  return res.assets.slice(0, limit).map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

export interface DayPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  takenAt: number | null;
}

export interface DayPhotos {
  photos: DayPhoto[];
  /** iOS "selected photos only": the user can widen the selection with presentLimitedPicker(). */
  limited: boolean;
}

/** Library photos taken on that calendar day (phone's time zone), newest first. */
export async function photosOfDay(date: Date, max = 60): Promise<DayPhotos> {
  const MediaLibrary = mediaLibrary();
  const perm = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  if (!perm.granted) throw new PhotoPermissionError('photos');
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const assets = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .gte(MediaLibrary.AssetField.CREATION_TIME, start.getTime())
    .lt(MediaLibrary.AssetField.CREATION_TIME, end.getTime())
    .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
    .limit(max)
    .exe();
  const infos = await Promise.all(assets.map((a) => a.getInfo()));
  return { photos: infos.map(toDayPhoto), limited: perm.accessPrivileges === 'limited' };
}

const toDayPhoto = (i: {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number | null;
}): DayPhoto => ({ id: i.id, uri: i.uri, width: i.width, height: i.height, takenAt: i.creationTime });

/**
 * Library photos taken within `radiusM` of a point, newest first. Looks through the latest
 * `scan` photos: reading a photo's location is cheap, decoding it is not, so only hits get info.
 */
export async function photosNear(center: LatLng, radiusM: number, max = 60, scan = 1500): Promise<DayPhotos> {
  const MediaLibrary = mediaLibrary();
  const perm = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  if (!perm.granted) throw new PhotoPermissionError('photos');
  const assets = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
    .limit(scan)
    .exe();
  const hits: typeof assets = [];
  for (let i = 0; i < assets.length && hits.length < max; i += 100) {
    const chunk = assets.slice(i, i + 100);
    const locations = await Promise.all(chunk.map((a) => a.getLocation().catch(() => null)));
    chunk.forEach((a, k) => {
      const l = locations[k];
      if (l && distanceMeters(center, { latitude: l.latitude, longitude: l.longitude }) <= radiusM) hits.push(a);
    });
  }
  const infos = await Promise.all(hits.slice(0, max).map((a) => a.getInfo()));
  return { photos: infos.map(toDayPhoto), limited: perm.accessPrivileges === 'limited' };
}

export const presentLimitedPicker = (): Promise<void> => mediaLibrary().presentPermissionsPickerAsync(['photo']);

/** Add-only access to the photo library, asked for when a card is saved. */
export async function saveToLibrary(uri: string): Promise<boolean> {
  const MediaLibrary = mediaLibrary();
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  await MediaLibrary.Asset.create(uri);
  return true;
}

/** A library asset as a PickedImage. iOS hands out ph:// URIs; the manipulator reads them directly. */
export const dayPhotoToPicked = (p: DayPhoto): PickedImage => ({
  uri: p.uri,
  width: p.width,
  height: p.height,
  takenAt: p.takenAt ? new Date(p.takenAt).toISOString() : undefined,
});

/** Camera support is a device matter: simulators and some tablets have none. */
export const cameraAvailable = (): boolean => Platform.OS === 'ios' || Platform.OS === 'android';

// Development only: lets a debugger drive the photo pipeline, e.g.
// __islandiaPhotos.photosOfDay(new Date()).then(r => __islandiaPhotos.importPhoto('jiufen', __islandiaPhotos.dayPhotoToPicked(r.photos[0])))
if (__DEV__) {
  (globalThis as any).__islandiaPhotos = { importPhoto, photosOfDay, pickPhotos, takePhoto, dayPhotoToPicked, photoUri, thumbUri, deletePhotoFiles };
}
