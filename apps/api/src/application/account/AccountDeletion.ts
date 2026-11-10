import {
  NotLoggedInError,
  WrongPasswordError,
} from "../../domain/user/errors.js";
import type { AccountRepository } from "../../domain/account/AccountRepository.js";
import { deleteAfterFor, nextStep } from "../../domain/account/rules.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { fullName } from "@talaan/shared";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type {
  AccountEmails,
  AccountNotice,
  EmailRecipient,
} from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { SessionStore } from "../ports/SessionStore.js";

// Deleting an account. Usually it's suspended first: nobody sees its records,
// and signing in within a year brings it back. After the year, or right away
// when asked, everything is deleted for good. Only the owner can do this.
export class AccountDeletion {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionStore,
    private readonly family: FamilyAccessRepository,
    private readonly storage: FileStorage | null,
    private readonly emails: AccountEmails | null,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  // Emails never stop the work
  private async tell(to: EmailRecipient, notice: AccountNotice) {
    if (!this.emails) return;
    try {
      await this.emails.sendAccountNotice(to, notice);
    } catch (error) {
      console.error(`Couldn't send the "${notice.kind}" email:`, error);
    }
  }

  private async checkPassword(userId: string, password: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    if (!(await this.passwords.compare(password, user.passwordHash))) {
      throw new WrongPasswordError("password");
    }
    return user;
  }

  // Suspend (deleted after a year unless they sign in). Signs out everywhere.
  async suspend(userId: string, password: string) {
    const user = await this.checkPassword(userId, password);
    const now = this.clock.now();
    const deleteAfter = deleteAfterFor(now);
    await this.accounts.suspend(userId, now, deleteAfter);
    await this.audit.log({
      ownerId: userId,
      action: "account.suspended",
      actorId: userId,
      subject: "Your account",
    });
    await this.sessions.deleteAllSessions(userId);
    await this.tell(user, { kind: "suspended", deleteAfter });
    const ownerName = fullName(user);
    for (const m of await this.family.listMembers(userId)) {
      await this.tell(m.person, {
        kind: "sharingEnded",
        ownerName,
        forGood: false,
      });
    }
    return { deleteAfter };
  }

  // Everything, right away. Can't be undone.
  async deleteNow(userId: string, password: string) {
    await this.checkPassword(userId, password);
    await this.sessions.deleteAllSessions(userId);
    await this.deleteForGood(userId, true);
  }

  // Signing in while suspended brings the account back
  async welcomeBack(userId: string) {
    if (!(await this.accounts.reactivate(userId))) return false;
    await this.audit.log({
      ownerId: userId,
      action: "account.reactivated",
      actorId: userId,
      subject: "Your account",
    });
    const user = await this.users.findById(userId);
    if (user) await this.tell(user, { kind: "reactivated" });
    return true;
  }

  // Run every hour: the 6-month email, the week-before email, and deleting
  async runDue() {
    const now = this.clock.now();
    let deleted = 0;
    for (const s of await this.accounts.listSuspended()) {
      const step = nextStep(s, now);
      const to = { email: s.email, firstName: s.firstName };
      if (step === "remind") {
        await this.accounts.markReminded(s.userId, now);
        await this.tell(to, {
          kind: "stillSuspended",
          deleteAfter: s.deleteAfter,
        });
      } else if (step === "warn") {
        await this.accounts.markWarned(s.userId, now);
        await this.tell(to, {
          kind: "deletingSoon",
          deleteAfter: s.deleteAfter,
        });
      } else if (step === "delete") {
        await this.deleteForGood(s.userId, false);
        deleted++;
      }
    }
    return deleted;
  }

  private async deleteForGood(userId: string, tellMembers: boolean) {
    const user = await this.users.findById(userId);
    if (!user) return;
    const name = fullName(user);
    const members = await this.family.listMembers(userId);
    const owners = await this.family.listOwners(userId);
    const keys = await this.accounts.storageKeys(userId);

    await this.accounts.remove(userId);

    // Photos and PDFs: after the database, so nothing points at a missing file
    if (this.storage) {
      for (const key of keys) {
        try {
          await this.storage.remove(key);
        } catch (error) {
          console.error(`Couldn't remove ${key} of a deleted account:`, error);
        }
      }
    }
    await this.tell(user, { kind: "deleted" });
    for (const o of owners) {
      await this.tell(o.person, { kind: "memberLeft", memberName: name });
    }
    if (tellMembers) {
      for (const m of members) {
        await this.tell(m.person, {
          kind: "sharingEnded",
          ownerName: name,
          forGood: true,
        });
      }
    }
  }
}
