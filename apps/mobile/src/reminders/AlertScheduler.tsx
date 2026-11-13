import { fetchAgenda, fetchReminders, useRecordAccounts } from "@talaan/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { phoneNotifications } from "./notifications";
import { planPhoneAlerts } from "./phoneAlerts";

const DAY = 24 * 60 * 60 * 1000;

// Keeps this phone's reminder notifications up to date: the next 7 days of
// every account it can see, planned again whenever reminders change
export function AlertScheduler() {
  const router = useRouter();
  const accounts = useRecordAccounts();
  const ids = (accounts.data ?? []).map((a) => a.ownerId);
  const plan = useQuery({
    queryKey: ["reminders", "phone-alerts", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = new Date();
      const lists = await Promise.all(ids.map((id) => fetchReminders(id)));
      const agendas = await Promise.all(
        ids.map((id) =>
          fetchAgenda(id, now, new Date(now.getTime() + 8 * DAY)),
        ),
      );
      const handled = new Set(
        agendas.flatMap((a) =>
          a.items
            .filter((i) => i.state === "done" || i.state === "skipped")
            .map((i) => `${i.reminderId}|${i.at}`),
        ),
      );
      return planPhoneAlerts(
        lists.flatMap((l) => l.reminders),
        handled,
        now,
      );
    },
  });

  useEffect(() => {
    if (!plan.data) return;
    const data = plan.data;
    void (async () => {
      if (!(await phoneNotifications.wanted())) return;
      if (
        !(await phoneNotifications.allowed()) &&
        !(await phoneNotifications.ask())
      )
        return;
      await phoneNotifications.schedule(data);
    })().catch(() => {
      // The phone refused (Expo Go limits, no permission): the emails and the
      // website's alerts still come; My alerts shows if they're off here
    });
  }, [plan.data]);

  useEffect(
    () => phoneNotifications.onTap((id) => router.push(`/reminders/${id}`)),
    [router],
  );
  return null;
}
