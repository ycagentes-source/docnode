import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'docnode_token';

const isWeb = Platform.OS === 'web';

let SecureStore: any = null;
if (!isWeb) {
  // Lazy require so web build doesn't fail
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStore = require('expo-secure-store');
}

export async function saveToken(token: string) {
  if (isWeb || !SecureStore) {
    await AsyncStorage.setItem(KEY, token);
  } else {
    await SecureStore.setItemAsync(KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (isWeb || !SecureStore) {
    return AsyncStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function clearToken() {
  if (isWeb || !SecureStore) {
    await AsyncStorage.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
