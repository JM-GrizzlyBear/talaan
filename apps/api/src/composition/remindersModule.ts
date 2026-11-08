import { AlertSettings } from "../application/reminder/AlertSettings.js";
import { ReminderAlerts } from "../application/reminder/ReminderAlerts.js";
import { Reminders } from "../application/reminder/Reminders.js";
import type { RecordAccess } from "../application/record/RecordAccess.js";
import { alertRoutes } from "../presentation/http/routes/alertRoutes.js";
import { remindersRoutes } from "../presentation/http/routes/remindersRoutes.js";
import type { AppContext } from "./context.js";

// Reminders, their alerts (email and browser notifications), and each
// person's alert settings
export function remindersModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  access: RecordAccess,
) {
  const reminders = new Reminders(
    repos.reminders,
    repos.records,
    access,
    audit,
    options.clock,
  );
  const settings = new AlertSettings(
    repos.alertSettings,
    options.pushSender ?? null,
  );
  const alerts = new ReminderAlerts(
    repos.reminders,
    repos.alertSettings,
    repos.users,
    repos.familyProfiles,
    options.emails,
    options.pushSender ?? null,
    options.clock,
  );
  const routers = [
    remindersRoutes({ reminders, requireAuth, limit: limits.records }),
    alertRoutes({ settings, requireAuth, limit: limits.records }),
  ];
  return { routers, alerts };
}
