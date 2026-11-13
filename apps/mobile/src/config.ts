// Where Talaan is. Set EXPO_PUBLIC_API_URL in apps/mobile/.env (Expo puts it
// into the app when it starts): the website's address, like
// https://talaan.netlify.app. The API answers there too (/api), so one
// address is enough. EXPO_PUBLIC_WEB_URL is only for a website elsewhere.
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = (fromEnv || "http://localhost:4000").replace(/\/+$/, "");
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || API_URL).replace(
  /\/+$/,
  "",
);
