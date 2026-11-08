import { describeAlert, REMINDER_KIND_LABELS } from "@talaan/shared";
import type {
  EmailRecipient,
  ReminderAlert,
} from "../../../application/ports/AccountEmails.js";
import { formatChangedAt } from "./passwordChangedEmail.js";
import { box, button, escapeHtml, layout, paragraph } from "./layout.js";

// "Now", "In 30 minutes", "Tomorrow" (approximately, for the subject)
export function alertLead(minutesBefore: number | null) {
  if (minutesBefore === null || minutesBefore === 0) return "Now";
  return `In ${describeAlert(minutesBefore).replace(/ before$/, "")}`;
}

export function reminderAlertEmail(
  to: EmailRecipient,
  alert: ReminderAlert,
  options: { reminderUrl: string; settingsUrl: string; timeZone: string },
) {
  const when = formatChangedAt(alert.occursAt, options.timeZone);
  const kind = REMINDER_KIND_LABELS[alert.kind];
  const lead = alertLead(alert.minutesBefore);
  const subject = `${lead}: ${alert.title} (${alert.personName})`;

  const details = [
    `<strong>${escapeHtml(kind)}</strong> for ${escapeHtml(alert.personName)}`,
    `${escapeHtml(when)} (Philippine time)`,
    alert.dose ? escapeHtml(alert.dose) : "",
    alert.note ? escapeHtml(alert.note) : "",
  ].filter(Boolean);

  const html = layout({
    title: alert.title,
    preview: `${lead}: ${alert.title}, ${when}.`,
    body: [
      paragraph(`Hi ${escapeHtml(to.firstName)},`),
      paragraph(
        `${escapeHtml(lead)}: <strong>${escapeHtml(alert.title)}</strong>.`,
      ),
      box(details.join("<br>")),
      `<div style="margin:20px 0">${button(options.reminderUrl, "Open the reminder")}</div>`,
    ].join("\n"),
    footer: `You get this because the reminder is shared with you. Turn alerts off for this reminder on its page, or for all reminders: ${escapeHtml(options.settingsUrl)}`,
  });

  const text = [
    `Hi ${to.firstName},`,
    "",
    `${lead}: ${alert.title}`,
    `${kind} for ${alert.personName}`,
    `${when} (Philippine time)`,
    alert.dose,
    alert.note,
    "",
    `Open the reminder: ${options.reminderUrl}`,
    `Turn alerts off: ${options.settingsUrl}`,
    "",
    "Talaan",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  return { subject, html, text };
}
