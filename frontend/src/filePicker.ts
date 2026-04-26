import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export type PickedFile = {
  base64: string; // raw base64 (no data: prefix)
  name: string;
  mimeType: string;
};

async function uriToBase64(uri: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // strip data:...;base64,
        const idx = result.indexOf('base64,');
        resolve(idx >= 0 ? result.slice(idx + 7) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy');
    const data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return data;
  }
}

export async function pickDocument(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const a = res.assets[0];
  const mime = a.mimeType || (a.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  const base64 = await uriToBase64(a.uri, mime);
  return { base64, name: a.name || 'arquivo', mimeType: mime };
}

export async function pickImageFromCamera(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const mime = a.mimeType || 'image/jpeg';
  const base64 = a.base64 || (await uriToBase64(a.uri, mime));
  return { base64, name: a.fileName || 'foto.jpg', mimeType: mime };
}

export async function pickImageFromLibrary(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const mime = a.mimeType || 'image/jpeg';
  const base64 = a.base64 || (await uriToBase64(a.uri, mime));
  return { base64, name: a.fileName || 'foto.jpg', mimeType: mime };
}
