// Web preview only: the browser's storage stands in for the app's folder
const PREFIX = "talaan.offline.";

export const files = {
  async read(name: string) {
    return localStorage.getItem(PREFIX + name);
  },
  async write(name: string, text: string) {
    localStorage.setItem(PREFIX + name, text);
  },
  async clear() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  },
};
