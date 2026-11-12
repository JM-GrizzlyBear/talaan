// The web preview (for checking screens in a browser) has no Keychain:
// the browser's storage stands in. The phone app never uses this file.
export const secure = {
  get: async (key: string) => localStorage.getItem(key),
  set: async (key: string, value: string) => localStorage.setItem(key, value),
  remove: async (key: string) => localStorage.removeItem(key),
};
