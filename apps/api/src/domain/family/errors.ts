import { maskEmail } from "@talaan/shared";

// Every family problem says what to do next
export class FamilyError extends Error {
  constructor(
    message: string,
    // The form field it's about, if any
    readonly field?: string,
  ) {
    super(message);
    this.name = "FamilyError";
  }

  static inviteYourself() {
    return new FamilyError("That's your own email.", "email");
  }

  static alreadyMember() {
    return new FamilyError(
      "That person can already see your records. Change what they can do in the list below.",
      "email",
    );
  }

  static tooManyMembers(max: number) {
    return new FamilyError(
      `You can share with up to ${max} people, counting invitations still waiting. Remove someone first.`,
    );
  }

  static tooManyProfiles(max: number) {
    return new FamilyError(`You can keep up to ${max} profiles.`);
  }

  static invitationUnusable(status: string) {
    const why =
      status === "expired"
        ? "This invitation has expired."
        : status === "accepted"
          ? "This invitation was already accepted."
          : status === "declined"
            ? "This invitation was declined."
            : "This invitation was cancelled.";
    return new FamilyError(`${why} Ask for a new one if you still need it.`);
  }

  static wrongAccount(invitedEmail: string) {
    return new FamilyError(
      `This invitation is for ${maskEmail(invitedEmail)}. Sign in with that email, or ask for an invitation to the email you use on Talaan.`,
    );
  }

  static cantRenewAccepted() {
    return new FamilyError("That invitation was already accepted.");
  }

  static profileHasRecords(firstName: string, count: number) {
    return new FamilyError(
      `${firstName} still has ${count} ${count === 1 ? "record" : "records"} (counting the Trash). Delete them for good first, or keep the profile.`,
    );
  }
}
