import type { EmailRecipient } from "../../../application/ports/AccountEmails.js";
import { box, button, escapeHtml, layout, paragraph } from "./layout.js";

// "Nov 4, 2026 at 9:41 PM" in Philippine time
export function formatChangedAt(date: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
  return `${day} at ${time}`;
}

export function passwordChangedEmail(
  to: EmailRecipient,
  changedAt: Date,
  options: {
    forgotPasswordUrl: string;
    timeZone: string;
    timeZoneLabel: string;
  },
) {
  const subject = "Your Talaan password was changed";
  const when = `${formatChangedAt(changedAt, options.timeZone)} (${options.timeZoneLabel})`;

  const html = layout({
    title: "Your password was changed",
    preview: `Your password was changed on ${when}.`,
    body: [
      paragraph(`Hi ${escapeHtml(to.name)},`),
      paragraph(
        `The password for <strong>${escapeHtml(to.email)}</strong> was changed on <strong>${escapeHtml(when)}</strong>. Other phones and computers were signed out.`,
      ),
      paragraph("If this was you, there's nothing else to do."),
      box(
        `<strong style="color:#12263a">Wasn't you?</strong> Someone may know your email password. Reset your Talaan password right away:<div style="margin-top:12px">${button(options.forgotPasswordUrl, "Reset my password")}</div>`,
      ),
    ].join("\n"),
    footer:
      "We send this email every time your password changes, so you always know.",
  });

  const text = [
    `Hi ${to.name},`,
    "",
    `The password for ${to.email} was changed on ${when}. Other phones and computers were signed out.`,
    "",
    "If this was you, there's nothing else to do.",
    `Wasn't you? Reset your password right away: ${options.forgotPasswordUrl}`,
    "",
    "Talaan",
  ].join("\n");

  return { subject, html, text };
}
