// Every passkey problem gets a message that says what to do instead
export class PasskeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasskeyError";
  }

  static didNotWork() {
    return new PasskeyError(
      "That passkey didn't work. Try again, or use your password.",
    );
  }

  static unknown() {
    return new PasskeyError(
      "Talaan doesn't know that passkey. It may have been removed. Use your password instead.",
    );
  }

  static expired() {
    return new PasskeyError("That took too long. Please try again.");
  }
}
