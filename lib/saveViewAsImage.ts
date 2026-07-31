import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef, type CaptureOptions } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';

type SaveOptions = {
  filename: string;
  dialogTitle?: string;
};

export type SaveViewResult = {
  mode: 'saved' | 'shared';
  localPath?: string;
  savedToPhotos: boolean;
};

export type IdentityCardCaptureRef = {
  capture: () => Promise<string>;
};

function captureOptions(): CaptureOptions {
  if (Platform.OS === 'web') {
    return { format: 'png', quality: 1, result: 'data-uri' };
  }

  return {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    ...(Platform.OS === 'ios' ? { useRenderInContext: true } : {}),
  };
}

function normalizeFileUri(uri: string) {
  if (
    Platform.OS !== 'web' &&
    !uri.startsWith('file://') &&
    !uri.startsWith('content://') &&
    !uri.startsWith('data:')
  ) {
    return `file://${uri}`;
  }
  return uri;
}

export async function captureIdentityCard(
  ref: RefObject<IdentityCardCaptureRef | View | null>
): Promise<string> {
  const target = ref.current;
  if (!target) throw new Error('ID card is not ready yet.');

  if ('capture' in target && typeof target.capture === 'function') {
    return target.capture();
  }

  return captureRef(ref as RefObject<View>, captureOptions());
}

export async function saveCapturedImage(
  rawUri: string,
  options: SaveOptions
): Promise<SaveViewResult> {
  const uri = normalizeFileUri(rawUri);

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') throw new Error('Download is not available here.');
    const link = document.createElement('a');
    link.href = uri;
    link.download = `${options.filename}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { mode: 'saved', savedToPhotos: false };
  }

  const localPath = await saveLocalCopy(uri, options.filename);

  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (permission.granted) {
      await MediaLibrary.saveToLibraryAsync(uri);
      return { mode: 'saved', localPath, savedToPhotos: true };
    }
  } catch {
    // Fall through to share/local-only save.
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: options.dialogTitle ?? 'Save your ID card',
      UTI: 'public.png',
    });
    return { mode: 'shared', localPath, savedToPhotos: false };
  }

  if (localPath) {
    return { mode: 'saved', localPath, savedToPhotos: false };
  }

  throw new Error('Could not save your ID card on this device.');
}

export async function saveViewAsImage(
  ref: RefObject<IdentityCardCaptureRef | View | null>,
  options: SaveOptions
): Promise<SaveViewResult> {
  const uri = await captureIdentityCard(ref);
  return saveCapturedImage(uri, options);
}

async function saveLocalCopy(uri: string, filename: string) {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return undefined;

  const dir = `${baseDir}id-cards/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}${filename}.png`;

  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1] ?? '';
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destination;
  }

  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
