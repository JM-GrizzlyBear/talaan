import * as SecureStore from "expo-secure-store";

// Small secrets (the session token, the Face ID key, the cache key) in the
// phone's Keychain (iPhone) or Keystore (Android). Only this app can read them.
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secure = {
  get: (key: string) => SecureStore.getItemAsync(key, options),
  set: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, options),
  remove: (key: string) => SecureStore.deleteItemAsync(key, options),
};
