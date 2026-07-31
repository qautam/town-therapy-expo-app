import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';

import { townAlert } from '@/context/TownAlertContext';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Android cropper is unreliable on many devices; iOS editor has a clear Done control.
  allowsEditing: Platform.OS === 'ios',
  aspect: [4, 3],
  quality: 0.85,
  exif: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** ImagePicker must not open under another Modal — wait for the town alert to close. */
function afterPrompt(action: () => void) {
  setTimeout(action, Platform.OS === 'ios' ? 350 : 500);
}

async function ensureCameraPermission() {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const asked = await ImagePicker.requestCameraPermissionsAsync();
  if (asked.granted) return true;

  townAlert(
    'Camera access needed',
    'Enable camera access in Settings so you can photograph the issue.',
    [
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
  return false;
}

async function ensureLibraryPermission() {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === 'limited') return true;

  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (asked.granted || asked.accessPrivileges === 'limited') return true;

  townAlert(
    'Photos access needed',
    'Enable photo library access in Settings so you can attach evidence.',
    [
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
  return false;
}

export async function takeReportPhoto(): Promise<string | null> {
  const ok = await ensureCameraPermission();
  if (!ok) return null;

  try {
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (error) {
    townAlert(
      'Could not open camera',
      error instanceof Error ? error.message : 'Try again, or choose a photo from your gallery.'
    );
    return null;
  }
}

export async function pickReportPhotoFromLibrary(): Promise<string | null> {
  const ok = await ensureLibraryPermission();
  if (!ok) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (error) {
    townAlert(
      'Could not open photos',
      error instanceof Error ? error.message : 'Try again, or take a new photo with the camera.'
    );
    return null;
  }
}

export function promptReportPhoto(onPicked: (uri: string) => void) {
  townAlert('Add photo', 'Attach a clear photo of the issue.', [
    {
      text: 'Take photo',
      onPress: () =>
        afterPrompt(() => {
          void takeReportPhoto().then((uri) => {
            if (uri) onPicked(uri);
          });
        }),
    },
    {
      text: 'Choose from gallery',
      onPress: () =>
        afterPrompt(() => {
          void pickReportPhotoFromLibrary().then((uri) => {
            if (uri) onPicked(uri);
          });
        }),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
