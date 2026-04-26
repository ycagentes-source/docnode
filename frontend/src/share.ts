import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

export async function shareOrDownload(base64: string, name: string, mime: string): Promise<void> {
  if (Platform.OS === 'web') {
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);

    if (navigator.share) {
      try {
        const file = new File([blob], name, { type: mime });
        // @ts-ignore
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          // @ts-ignore
          await navigator.share({ files: [file], title: name });
          URL.revokeObjectURL(url);
          return;
        }
      } catch {}
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy');
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const path = `${dir}${Date.now()}-${name}`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: mime, dialogTitle: name });
  }
}
