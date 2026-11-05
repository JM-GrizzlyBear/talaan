import { EMAIL_CODE } from "@talaan/shared";
import type { EmailRecipient } from "../../../application/ports/AccountEmails.js";
import { box, codeBlock, escapeHtml, layout, paragraph } from "./layout.js";

export function signInCodeEmail(
  to: EmailRecipient,
  code: string,
  links: { forgotPasswordUrl: string },
) {
  const subject = `${code} is your Talaan sign-in code`;
  const name = escapeHtml(to.firstName);

  const html = layout({
    title: "Finish signing in",
    preview: `Your sign-in code is ${code}. It works for ${EMAIL_CODE.minutes} minutes.`,
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        "Your password was entered on a browser Talaan doesn't know yet. To finish signing in, enter this code:",
      ),
      codeBlock(code),
      paragraph(
        `The code works for <strong style="color:#12263a">${EMAIL_CODE.minutes} minutes</strong>.`,
        { muted: true, small: true },
      ),
      box(
        `<strong style="color:#12263a">Wasn't you?</strong> Then someone knows your password. They can't get in without this code, but please <a href="${escapeHtml(links.forgotPasswordUrl)}" style="color:#0e7c6b">change your password</a> now. Never share the code, not even with someone who says they're from Talaan.`,
      ),
    ].join("\n"),
    footer: `You got this email because someone signed in to the Talaan account of ${escapeHtml(to.email)}.`,
  });

  const text = [
    `Hi ${to.firstName},`,
    "",
    "Your password was entered on a browser Talaan doesn't know yet. To finish signing in, enter this code:",
    "",
    code,
    "",
    `The code works for ${EMAIL_CODE.minutes} minutes.`,
    "",
    `Wasn't you? Someone knows your password. Change it now: ${links.forgotPasswordUrl}`,
    "Never share the code.",
    "",
    "Talaan",
  ].join("\n");

  return { subject, html, text };
}
