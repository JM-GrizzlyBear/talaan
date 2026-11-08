import webpush from "web-push";
import type {
  PushMessage,
  PushSender,
  PushTarget,
} from "../../application/ports/PushSender.js";

export interface WebPushSettings {
  publicKey: string;
  privateKey: string;
  // Who to contact about these notifications: "mailto:…" or a website
  subject: string;
}

// Browser notifications through each browser's push service (free). The
// message is encrypted for that browser; the push service can't read it.
export class WebPushSender implements PushSender {
  readonly publicKey: string;

  constructor(private readonly settings: WebPushSettings) {
    this.publicKey = settings.publicKey;
  }

  async send(target: PushTarget, message: PushMessage) {
    try {
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify(message),
        {
          vapidDetails: {
            subject: this.settings.subject,
            publicKey: this.settings.publicKey,
            privateKey: this.settings.privateKey,
          },
          // Not worth showing a day late
          TTL: 24 * 60 * 60,
          urgency: "high",
        },
      );
      return "sent" as const;
    } catch (error) {
      // 404/410: the browser turned notifications off or was reset
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return "gone" as const;
      throw error;
    }
  }
}
