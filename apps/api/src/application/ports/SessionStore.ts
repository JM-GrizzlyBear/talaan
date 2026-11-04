// The signed-in sessions, so a password change can sign other devices out
export interface SessionStore {
  // Every session of this user, except the one with this id (the current browser)
  deleteAllSessions(userId: string, exceptSessionId?: string): Promise<void>;
}
