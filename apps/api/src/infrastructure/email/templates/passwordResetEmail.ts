import { RESET_CODE } from "@talaan/shared";
import type { EmailRecipient } from "../../../application/ports/AccountEmails.js";
import { box, codeBlock, escapeHtml, layout, paragraph } from "./layout.js";

export function passwordResetEmail(to: EmailRecipient, code: string) {
  const subject = `${code} is your Talaan code`;
  const name = escapeHtml(to.firstName);

  const html = layout({
    title: "Reset your password",
    preview: `Your code is ${code}. It works for ${RESET_CODE.minutes} minutes.`,
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        "Someone asked to reset your Talaan password. If it was you, enter this code on the Forgot password page:",
      ),
      codeBlock(code),
      paragraph(
        `The code works for <strong style="color:#12263a">${RESET_CODE.minutes} minutes</strong>. Asking again sends a new code, and this one stops working.`,
        { muted: true, small: true },
      ),
      box(
        `<strong style="color:#12263a">Didn't ask for this?</strong> You can ignore this email. Your password stays the same, and nobody can change it without this code. Never share the code, not even with someone who says they're from Talaan.`,
      ),
    ].join("\n"),
    footer: `You got this email because someone entered ${escapeHtml(to.email)} on the Forgot password page.`,
  });

  const text = [
    `Hi ${to.firstName},`,
    "",
    "Someone asked to reset your Talaan password. If it was you, enter this code:",
    "",
    code,
    "",
    `The code works for ${RESET_CODE.minutes} minutes.`,
    "",
    "Didn't ask for this? Ignore this email. Your password stays the same. Never share the code.",
    "",
    "Talaan",
  ].join("\n");

  return { subject, html, text };
}
