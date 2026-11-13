import type { PhoneAlert } from "./phoneAlerts";

// The web preview has no phone notifications
export const phoneNotifications = {
  wanted: async () => false,
  allowed: async () => false,
  ask: async () => false,
  setWanted: async (_on: boolean) => {},
  schedule: async (_plan: PhoneAlert[]) => {},
  clear: async () => {},
  onTap: (_open: (reminderId: string) => void) => () => {},
};
