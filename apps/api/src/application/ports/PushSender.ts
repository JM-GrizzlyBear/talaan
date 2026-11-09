// A notification for one browser
export interface PushMessage {
  title: string;
  body: string;
  // Opened when the notification is tapped
  url: string;
  // Notifications with the same tag replace each other
  tag: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Browser notifications (Web Push). The use cases don't know how they're sent.
export interface PushSender {
  // The public key browsers sign up with
  readonly publicKey: string;
  // "gone": the browser turned notifications off; forget it
  send(target: PushTarget, message: PushMessage): Promise<"sent" | "gone">;
}
