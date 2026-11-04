export class UsernameTakenError extends Error {
  constructor() {
    super("That username is taken");
    this.name = "UsernameTakenError";
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super("That email already has an account");
    this.name = "EmailTakenError";
  }
}

// The same message for an unknown user and a wrong password,
// so nobody can find out which usernames exist
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Wrong username, email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class NotLoggedInError extends Error {
  constructor() {
    super("Please log in");
    this.name = "NotLoggedInError";
  }
}
