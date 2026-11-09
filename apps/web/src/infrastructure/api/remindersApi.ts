import type {
  AgendaInfo,
  AlertSettings,
  AlertSettingsInfo,
  OccurrenceAction,
  ReminderFieldsInput,
  ReminderInfo,
  ReminderListInfo,
} from "@talaan/shared";
import { request } from "./http";

const at = (id: string) => `/api/reminders/${encodeURIComponent(id)}`;

export async function fetchReminders(ownerId: string) {
  return await request<ReminderListInfo>(
    `/api/reminders?ownerId=${encodeURIComponent(ownerId)}`,
  );
}

export async function fetchAgenda(ownerId: string, from: Date, to: Date) {
  const query = new URLSearchParams({
    ownerId,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return await request<AgendaInfo>(`/api/reminders/agenda?${query}`);
}

export async function fetchReminder(id: string) {
  return (await request<{ reminder: ReminderInfo }>(at(id))).reminder;
}

export async function createReminder(
  ownerId: string,
  fields: ReminderFieldsInput,
) {
  const data = await request<{ reminder: ReminderInfo }>(
    "/api/reminders",
    "POST",
    { ownerId, ...fields },
  );
  return data.reminder;
}

export async function updateReminder(id: string, fields: ReminderFieldsInput) {
  return (await request<{ reminder: ReminderInfo }>(at(id), "PUT", fields))
    .reminder;
}

export async function removeReminder(id: string) {
  await request<void>(at(id), "DELETE");
}

export async function setReminderPaused(id: string, paused: boolean) {
  await request<void>(`${at(id)}/${paused ? "pause" : "resume"}`, "POST");
}

export async function actOnOccurrence(id: string, action: OccurrenceAction) {
  await request<void>(`${at(id)}/occurrences`, "POST", action);
}

export async function setMyAlerts(id: string, muted: boolean) {
  await request<void>(`${at(id)}/my-alerts`, "PUT", { muted });
}

export async function fetchAlertSettings() {
  return await request<AlertSettingsInfo>("/api/account/alerts");
}

export async function saveAlertSettings(settings: AlertSettings) {
  return await request<AlertSettingsInfo>(
    "/api/account/alerts",
    "PUT",
    settings,
  );
}

export async function addPushDevice(device: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label: string;
}) {
  return (
    await request<{ device: { id: string } }>(
      "/api/account/alerts/devices",
      "POST",
      device,
    )
  ).device;
}

export async function removePushDevice(id: string) {
  await request<void>(
    `/api/account/alerts/devices/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

export async function sendTestPush() {
  return (await request<{ sent: number }>("/api/account/alerts/test", "POST"))
    .sent;
}
