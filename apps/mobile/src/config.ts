// Where the Talaan server is. Set EXPO_PUBLIC_API_URL in apps/mobile/.env
// (Expo puts it into the app when it starts). The website is on the same
// address for now (the test server serves both).
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = (fromEnv || "http://localhost:4000").replace(/\/+$/, "");
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || API_URL).replace(
  /\/+$/,
  "",
);
