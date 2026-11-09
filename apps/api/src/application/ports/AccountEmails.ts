export interface EmailRecipient {
  email: string;
  // Emails greet people by their first name
  firstName: string;
}

import type {
  AccessLevel,
  FamilyRelationship,
  ReminderKind,
} from "@talaan/shared";

export interface FamilyInvitationEmail {
  inviterName: string;
  // Who the person invited is to the inviter
  relationship: FamilyRelationship;
  access: AccessLevel;
  // The secret for the link (the email builds the full address)
  token: string;
  expiresAt: Date;
}

// One alert of a reminder
export interface ReminderAlert {
  reminderId: string;
  kind: ReminderKind;
  title: string;
  dose: string;
  note: string;
  // Who it's for (the owner or a family member)
  personName: string;
  occursAt: Date;
  // How long before it this alert is (0: now; null: a snooze ending)
  minutesBefore: number | null;
}

// A doctor's link was opened
export interface ShareOpened {
  shareId: string;
  // Who the link is for ("Dr. Reyes")
  recipient: string;
  // Whose records
  personName: string;
  // "Chrome on Android"
  device: string;
  openedAt: Date;
}

// The emails about someone's account. The use cases don't know how email is sent.
export interface AccountEmails {
  sendPasswordResetCode(to: EmailRecipient, code: string): Promise<void>;
  // Two-step sign-in: the password was right, this code finishes signing in
  sendSignInCode(to: EmailRecipient, code: string): Promise<void>;
  // An invitation to see someone's records. Sent to an email that may not
  // have an account yet.
  sendFamilyInvitation(
    to: string,
    invitation: FamilyInvitationEmail,
  ): Promise<void>;
  // A heads-up after a password change. Best effort: never throws, so a mail
  // problem can't undo a password change that already happened.
  sendPasswordChanged(to: EmailRecipient, changedAt: Date): Promise<void>;
  sendReminderAlert(to: EmailRecipient, alert: ReminderAlert): Promise<void>;
  sendShareOpened(to: EmailRecipient, opened: ShareOpened): Promise<void>;
}
