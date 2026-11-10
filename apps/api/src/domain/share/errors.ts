// The doctor's page can't open, with what to tell them
export class ShareError extends Error {
  constructor(
    message: string,
    readonly kind: "pin" | "wait" | "used",
  ) {
    super(message);
    this.name = "ShareError";
  }

  static wrongPin(left: number) {
    return new ShareError(
      left > 0
        ? `That PIN isn't right. ${left} ${left === 1 ? "try" : "tries"} left before it waits.`
        : "That PIN isn't right.",
      "pin",
    );
  }

  static wait(minutes: number) {
    return new ShareError(
      `Too many wrong PINs. Please try again in ${minutes} minutes, or ask for the PIN again.`,
      "wait",
    );
  }

  static usedUp() {
    return new ShareError(
      "This link was already opened as many times as allowed. Ask for a new link.",
      "used",
    );
  }
}

// A link that can't be made or changed, with the form box it's about
export class ShareFormError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ShareFormError";
  }
}
