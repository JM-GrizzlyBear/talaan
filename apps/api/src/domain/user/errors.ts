export class EmailTakenError extends Error {
  constructor() {
    super("That email already has an account. Sign in instead.");
    this.name = "EmailTakenError";
  }
}

// The same message for an unknown email and a wrong password,
// so nobody can find out which emails have an account
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Wrong email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class NotLoggedInError extends Error {
  constructor() {
    super("Please sign in");
    this.name = "NotLoggedInError";
  }
}

// Signed in, but nobody used the website for a while: the password is needed again
export class SessionLockedError extends Error {
  constructor() {
    super("Talaan is locked. Enter your password to continue.");
    this.name = "SessionLockedError";
  }
}

// The signed-in person typed the wrong password (unlocking, or changing it)
export class WrongPasswordError extends Error {
  constructor(readonly field: "password" | "currentPassword") {
    super("That password isn't right");
    this.name = "WrongPasswordError";
  }
}

// The phone's Face ID / fingerprint key wasn't the one made for this session
export class DeviceKeyError extends Error {
  constructor() {
    super(
      "Unlocking with Face ID or fingerprint didn't work. Use your password.",
    );
    this.name = "DeviceKeyError";
  }
}
