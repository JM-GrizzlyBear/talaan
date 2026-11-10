import type {
  EmailRecipient,
  ShareOpened,
} from "../../../application/ports/AccountEmails.js";
import { formatChangedAt } from "./passwordChangedEmail.js";
import { box, button, escapeHtml, layout, paragraph } from "./layout.js";

export function shareOpenedEmail(
  to: EmailRecipient,
  opened: ShareOpened,
  options: { shareUrl: string; settingsUrl: string; timeZone: string },
) {
  const when = formatChangedAt(opened.openedAt, options.timeZone);
  const subject = `${opened.recipient} opened ${opened.personName}'s records`;

  const html = layout({
    title: "Your shared link was opened",
    preview: `${opened.recipient}'s link was opened ${when}.`,
    body: [
      paragraph(`Hi ${escapeHtml(to.firstName)},`),
      paragraph(
        `The link you made for <strong>${escapeHtml(opened.recipient)}</strong> was just opened.`,
      ),
      box(
        [
          `Records of <strong>${escapeHtml(opened.personName)}</strong>`,
          `${escapeHtml(when)} (Philippine time)`,
          `On ${escapeHtml(opened.device)}`,
        ].join("<br>"),
      ),
      paragraph(
        "If you didn't expect this, open the link's page and stop it. It stops working at once.",
      ),
      `<div style="margin:20px 0">${button(options.shareUrl, "See the link")}</div>`,
    ].join("\n"),
    footer: `You get this because you or your family made this link. Turn alerts off in your alert settings: ${escapeHtml(options.settingsUrl)}`,
  });

  const text = [
    `Hi ${to.firstName},`,
    "",
    `The link you made for ${opened.recipient} was just opened.`,
    `Records of ${opened.personName}`,
    `${when} (Philippine time)`,
    `On ${opened.device}`,
    "",
    "If you didn't expect this, open the link's page and stop it:",
    options.shareUrl,
    "",
    `Turn alerts off: ${options.settingsUrl}`,
    "",
    "Talaan",
  ].join("\n");

  return { subject, html, text };
}
