import nodemailer, { type Transporter } from "nodemailer";
import type {
  AccountEmails,
  EmailRecipient,
  FamilyInvitationEmail,
  ReminderAlert,
  ShareOpened,
} from "../../application/ports/AccountEmails.js";
import { familyInvitationEmail } from "./templates/familyInvitationEmail.js";
import { passwordChangedEmail } from "./templates/passwordChangedEmail.js";
import { reminderAlertEmail } from "./templates/reminderAlertEmail.js";
import { passwordResetEmail } from "./templates/passwordResetEmail.js";
import { shareOpenedEmail } from "./templates/shareOpenedEmail.js";
import { signInCodeEmail } from "./templates/signInCodeEmail.js";

export interface SmtpSettings {
  host: string;
  port: number;
  // The login of a real email service (Brevo); Mailpit needs none
  user?: string;
  pass?: string;
  from: string;
  // Where the website runs, for links in the emails
  appUrl: string;
}

// Sends the account emails through an SMTP server. Locally that's Mailpit,
// which keeps every email in its inbox (http://localhost:8025) instead of delivering it.
// On the live site it's a real email service such as Brevo, with a login.
export class SmtpAccountEmails implements AccountEmails {
  private readonly transport: Transporter;

  constructor(private readonly settings: SmtpSettings) {
    this.transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      // Port 465 is encrypted from the start; 587, 2525 (and Mailpit's 1025)
      // switch to encryption (STARTTLS) when the server offers it
      secure: settings.port === 465,
      auth:
        settings.user && settings.pass
          ? { user: settings.user, pass: settings.pass }
          : undefined,
    });
  }

  private async send(
    to: string,
    email: { subject: string; html: string; text: string },
  ) {
    await this.transport.sendMail({ from: this.settings.from, to, ...email });
  }

  async sendPasswordResetCode(to: EmailRecipient, code: string) {
    await this.send(to.email, passwordResetEmail(to, code));
  }

  async sendSignInCode(to: EmailRecipient, code: string) {
    await this.send(
      to.email,
      signInCodeEmail(to, code, {
        forgotPasswordUrl: `${this.settings.appUrl}/forgot-password`,
      }),
    );
  }

  async sendFamilyInvitation(to: string, invitation: FamilyInvitationEmail) {
    await this.send(
      to,
      familyInvitationEmail(
        to,
        invitation,
        { invitationUrl: `${this.settings.appUrl}/invite/${invitation.token}` },
        { timeZone: "Asia/Manila" },
      ),
    );
  }

  async sendPasswordChanged(to: EmailRecipient, changedAt: Date) {
    try {
      await this.send(
        to.email,
        passwordChangedEmail(to, changedAt, {
          forgotPasswordUrl: `${this.settings.appUrl}/forgot-password`,
          timeZone: "Asia/Manila",
          timeZoneLabel: "Philippine time",
        }),
      );
    } catch (error) {
      // The password already changed; a missing heads-up email mustn't turn that into an error
      console.error("Couldn't send the password-changed email:", error);
    }
  }

  async sendShareOpened(to: EmailRecipient, opened: ShareOpened) {
    await this.send(
      to.email,
      shareOpenedEmail(to, opened, {
        shareUrl: `${this.settings.appUrl}/shares/${opened.shareId}`,
        settingsUrl: `${this.settings.appUrl}/settings/alerts`,
        timeZone: "Asia/Manila",
      }),
    );
  }

  async sendReminderAlert(to: EmailRecipient, alert: ReminderAlert) {
    await this.send(
      to.email,
      reminderAlertEmail(to, alert, {
        reminderUrl: `${this.settings.appUrl}/reminders/${alert.reminderId}`,
        settingsUrl: `${this.settings.appUrl}/settings/alerts`,
        timeZone: "Asia/Manila",
      }),
    );
  }
}
