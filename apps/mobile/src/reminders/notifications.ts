import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { secure } from "../storage/secure";
import type { PhoneAlert } from "./phoneAlerts";

// Notifications on this phone: reminders' alerts, scheduled here
const SETTING = "talaan.phoneAlerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const phoneNotifications = {
  // On unless turned off on this phone (and the phone allows them)
  async wanted() {
    return (await secure.get(SETTING)) !== "off";
  },
  async allowed() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  },
  async ask() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },
  async setWanted(on: boolean) {
    await secure.set(SETTING, on ? "on" : "off");
    if (!on) await Notifications.cancelAllScheduledNotificationsAsync();
  },
  // Replaces everything waiting with this plan
  async schedule(plan: PhoneAlert[]) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const alert of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: alert.id.replace(/[^\w-]/g, "_"),
        content: {
          title: alert.title,
          body: alert.body,
          data: { reminderId: alert.reminderId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alert.at,
          channelId: "reminders",
        },
      });
    }
  },
  async clear() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
  // Tapping one opens its reminder
  onTap(open: (reminderId: string) => void) {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.content.data?.reminderId;
        if (typeof id === "string") open(id);
      },
    );
    return () => sub.remove();
  },
};
