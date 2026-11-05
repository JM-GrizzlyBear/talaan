// Every problem with a reset code says what to do next, without revealing
// whether the email has an account
export class CodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeError";
  }

  static unusable() {
    return new CodeError(
      "That code has expired or isn't right. Ask for a new code.",
    );
  }

  static wrong(triesLeft: number) {
    return new CodeError(
      triesLeft > 0
        ? `That code isn't right. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
        : "That code isn't right, and it has stopped working. Ask for a new code.",
    );
  }
}

// The server has no way to send email (SMTP isn't set up)
export class EmailNotSetUpError extends Error {
  constructor() {
    super(
      "Password reset by email isn't set up on this server yet. Please try again later.",
    );
    this.name = "EmailNotSetUpError";
  }
}
