import type { SessionStore } from "../ports/SessionStore.js";

// "Sign out everywhere else": every other browser and device has to sign in again
export class SignOutOtherSessions {
  constructor(private readonly sessions: SessionStore) {}

  async execute(userId: string, currentSessionId: string) {
    await this.sessions.deleteAllSessions(userId, currentSessionId);
  }
}
