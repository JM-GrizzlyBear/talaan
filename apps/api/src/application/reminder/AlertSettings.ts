import type { AlertSettings as Settings } from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import { PushNotSetUpError } from "../../domain/reminder/errors.js";
import type { AlertSettingsRepository } from "../../domain/reminder/ReminderRepository.js";
import type { PushSender } from "../ports/PushSender.js";

// Each person's own alerts: email and browser notifications on or off, and
// the browsers that show notifications
export class AlertSettings {
  constructor(
    private readonly settings: AlertSettingsRepository,
    private readonly push: PushSender | null,
  ) {}

  async get(userId: string) {
    return {
      ...(await this.settings.get(userId)),
      pushKey: this.push?.publicKey ?? null,
      devices: await this.settings.devices(userId),
    };
  }

  async set(userId: string, settings: Settings) {
    await this.settings.set(userId, settings);
  }

  async addDevice(
    userId: string,
    device: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      label: string;
    },
  ) {
    if (!this.push) throw new PushNotSetUpError();
    return await this.settings.addDevice(userId, {
      endpoint: device.endpoint,
      p256dh: device.keys.p256dh,
      auth: device.keys.auth,
      label: device.label,
    });
  }

  async removeDevice(userId: string, id: string) {
    if (!(await this.settings.removeDevice(userId, id))) {
      throw new NotFoundError("That browser isn't on your list anymore.");
    }
  }

  // "Send a test" on the settings page: to this person's browsers now
  async testPush(userId: string) {
    if (!this.push) throw new PushNotSetUpError();
    let sent = 0;
    for (const device of await this.settings.devices(userId)) {
      const result = await this.push
        .send(device, {
          title: "Talaan notifications work",
          body: "Reminder alerts will show like this.",
          url: "/reminders",
          tag: "test",
        })
        .catch(() => "failed" as const);
      if (result === "gone")
        await this.settings.forgetEndpoint(device.endpoint);
      if (result === "sent") sent++;
    }
    return sent;
  }
}
