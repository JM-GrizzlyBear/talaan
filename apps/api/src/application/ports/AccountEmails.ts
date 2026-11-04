export interface EmailRecipient {
  email: string;
  // Emails greet people by their first name
  firstName: string;
}

// The emails about someone's account. The use cases don't know how email is sent.
export interface AccountEmails {
  sendPasswordResetCode(to: EmailRecipient, code: string): Promise<void>;
  // A heads-up after a password change. Best effort: never throws, so a mail
  // problem can't undo a password change that already happened.
  sendPasswordChanged(to: EmailRecipient, changedAt: Date): Promise<void>;
}
