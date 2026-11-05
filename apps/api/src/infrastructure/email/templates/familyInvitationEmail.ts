import {
  ACCESS_FOR_INVITEE,
  ACCESS_LABELS,
  relationshipLabel,
} from "@talaan/shared";
import type { FamilyInvitationEmail } from "../../../application/ports/AccountEmails.js";
import { box, button, escapeHtml, layout, paragraph } from "./layout.js";

export function familyInvitationEmail(
  to: string,
  invitation: FamilyInvitationEmail,
  links: { invitationUrl: string },
  format: { timeZone: string },
) {
  const inviter = escapeHtml(invitation.inviterName);
  const as = escapeHtml(relationshipLabel(invitation.relationship));
  const access = ACCESS_LABELS[invitation.access];
  const until = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: format.timeZone,
  }).format(invitation.expiresAt);
  const subject = `${invitation.inviterName} invited you to their health records on Talaan`;

  const html = layout({
    title: "You're invited",
    preview: `${invitation.inviterName} wants to share their health records with you.`,
    body: [
      paragraph("Hi,"),
      paragraph(
        `<strong style="color:#12263a">${inviter}</strong> wants to share their health records with you on Talaan, as their <strong style="color:#12263a">${as}</strong>.`,
      ),
      box(
        `<strong style="color:#12263a">${escapeHtml(access.name)}.</strong> ${escapeHtml(ACCESS_FOR_INVITEE[invitation.access])}`,
      ),
      `<div style="margin:24px 0 0">${button(links.invitationUrl, "See the invitation")}</div>`,
      paragraph(
        `You can accept or decline. To accept, sign in (or create a free account) with this email address, ${escapeHtml(to)}. The link works until ${escapeHtml(until)}.`,
        { muted: true, small: true },
      ),
      paragraph(
        "Don't know who this is? Decline, or ignore this email. Nothing is shared until you accept.",
        { muted: true, small: true },
      ),
    ].join("\n"),
    footer: `You got this email because ${inviter} entered ${escapeHtml(to)} on Talaan.`,
  });

  const text = [
    "Hi,",
    "",
    `${invitation.inviterName} wants to share their health records with you on Talaan, as their ${relationshipLabel(invitation.relationship)}.`,
    "",
    `${access.name}. ${ACCESS_FOR_INVITEE[invitation.access]}`,
    "",
    `See the invitation: ${links.invitationUrl}`,
    "",
    `To accept, sign in (or create a free account) with ${to}. The link works until ${until}.`,
    "Don't know who this is? Decline, or ignore this email. Nothing is shared until you accept.",
    "",
    "Talaan",
  ].join("\n");

  return { subject, html, text };
}
