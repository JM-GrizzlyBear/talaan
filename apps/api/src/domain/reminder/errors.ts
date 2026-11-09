// A reminder change that can't be done, with the form box it's about
export class ReminderError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ReminderError";
  }
}

// Browser notifications need VAPID keys on the API
export class PushNotSetUpError extends Error {
  constructor() {
    super(
      "Browser notifications aren't set up on this Talaan yet. Alerts still come by email.",
    );
    this.name = "PushNotSetUpError";
  }
}
