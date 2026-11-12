import type {
  AccountNotice,
  EmailRecipient,
} from "../../../application/ports/AccountEmails.js";
import { box, button, escapeHtml, layout, paragraph } from "./layout.js";
import { formatChangedAt } from "./passwordChangedEmail.js";

const day = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);

interface Content {
  subject: string;
  title: string;
  // Plain sentences (escaped here)
  lines: string[];
  note?: string;
  action?: { label: string; url: string };
}

function contentFor(
  notice: AccountNotice,
  options: { appUrl: string; timeZone: string },
): Content {
  const signIn = {
    label: "Sign in to keep it",
    url: `${options.appUrl}/login`,
  };
  switch (notice.kind) {
    case "suspended": {
      const when = day(notice.deleteAfter, options.timeZone);
      return {
        subject: "Your Talaan account is suspended",
        title: "Your account is suspended",
        lines: [
          "You asked to delete your Talaan account. It's suspended now: nobody can see your records, family sharing and doctor links are off, and reminders have stopped.",
          `Everything will be deleted for good on ${when}. Until then, signing in brings your account back just as it was.`,
        ],
        note: "If you didn't ask for this, sign in now and change your password.",
        action: {
          label: "Sign in to bring it back",
          url: `${options.appUrl}/login`,
        },
      };
    }
    case "stillSuspended": {
      const when = day(notice.deleteAfter, options.timeZone);
      return {
        subject: `Your Talaan account will be deleted on ${when}`,
        title: "Your account is still suspended",
        lines: [
          `Your records, photos and PDFs are kept until ${when}, then deleted for good.`,
          "To keep them, just sign in. Your account comes back as it was.",
        ],
        action: signIn,
      };
    }
    case "deletingSoon": {
      const when = day(notice.deleteAfter, options.timeZone);
      return {
        subject: "Your Talaan account will be deleted in a week",
        title: "Deleted in a week",
        lines: [
          `On ${when}, your Talaan account and everything in it will be deleted for good. This can't be undone.`,
          "To keep it, sign in before then.",
        ],
        action: signIn,
      };
    }
    case "deleted":
      return {
        subject: "Your Talaan account was deleted",
        title: "Your account was deleted",
        lines: [
          "Your Talaan account and everything in it were deleted: records, photos and PDFs, places, reminders, Medical IDs and doctor links.",
          "Thank you for using Talaan. You're always welcome to make a new account.",
        ],
      };
    case "reactivated":
      return {
        subject: "Welcome back to Talaan",
        title: "Your account is active again",
        lines: [
          "You signed in, so your account isn't being deleted anymore. Everything is just as it was: records, family sharing and reminders.",
          "Doctor links and the emergency QR that were still within their time work again too.",
        ],
        note: "If this wasn't you, change your password now.",
      };
    case "exported":
      return {
        subject: "Your Talaan data was downloaded",
        title: "Your data was downloaded",
        lines: [
          `A copy of all your records was downloaded on ${formatChangedAt(notice.at, options.timeZone)} (Philippine time), on ${notice.device}.`,
        ],
        note: "If this wasn't you, change your password now and sign out other browsers on the Security page.",
        action: {
          label: "Open Security",
          url: `${options.appUrl}/settings/security`,
        },
      };
    case "sharingEnded":
      return {
        subject: `${notice.ownerName}'s records are no longer shared with you`,
        title: "Sharing ended",
        lines: [
          notice.forGood
            ? `${notice.ownerName} deleted their Talaan account, so their records are no longer shared with you.`
            : `${notice.ownerName} is deleting their Talaan account, so their records are no longer shared with you. If they come back, sharing comes back too.`,
        ],
      };
    case "memberLeft":
      return {
        subject: `${notice.memberName} left Talaan`,
        title: `${notice.memberName} left Talaan`,
        lines: [
          `${notice.memberName} deleted their Talaan account, so they can no longer see the records you shared with them.`,
        ],
      };
  }
}

export function accountNoticeEmail(
  to: EmailRecipient,
  notice: AccountNotice,
  options: { appUrl: string; timeZone: string },
) {
  const c = contentFor(notice, options);
  const html = layout({
    title: c.title,
    preview: c.lines[0],
    body: [
      paragraph(`Hi ${escapeHtml(to.firstName)},`),
      ...c.lines.map((line) => paragraph(escapeHtml(line))),
      c.note ? box(escapeHtml(c.note)) : "",
      c.action
        ? `<div style="margin:24px 0 4px">${button(c.action.url, c.action.label)}</div>`
        : "",
    ].join("\n"),
    footer: "This email is about your account, so it can't be turned off.",
  });
  const text = [
    `Hi ${to.firstName},`,
    "",
    ...c.lines.flatMap((line) => [line, ""]),
    ...(c.note ? [c.note, ""] : []),
    ...(c.action ? [`${c.action.label}: ${c.action.url}`, ""] : []),
    "Talaan",
  ].join("\n");
  return { subject: c.subject, html, text };
}
