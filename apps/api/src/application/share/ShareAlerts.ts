import type { AlertSettingsRepository } from "../../domain/reminder/ReminderRepository.js";
import type { ShareLink } from "../../domain/share/ShareLink.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { PushSender } from "../ports/PushSender.js";

// "Dr. Reyes opened the link": to the owner and whoever made the link, by
// email and browser notification, as each of them set their alerts
export class ShareAlerts {
  constructor(
    private readonly users: UserRepository,
    private readonly settings: AlertSettingsRepository,
    private readonly emails: AccountEmails | null,
    private readonly push: PushSender | null,
  ) {}

  async opened(
    link: ShareLink,
    opened: { personName: string; device: string; at: Date },
  ) {
    const people = [
      ...new Set([link.ownerId, link.createdBy].filter(Boolean)),
    ] as string[];
    for (const userId of people) {
      try {
        await this.tell(userId, link, opened);
      } catch (error) {
        console.error("Couldn't send a share alert:", error);
      }
    }
  }

  private async tell(
    userId: string,
    link: ShareLink,
    opened: { personName: string; device: string; at: Date },
  ) {
    const user = await this.users.findById(userId);
    if (!user) return;
    const wants = await this.settings.get(userId);
    if (wants.email && this.emails) {
      await this.emails.sendShareOpened(
        { email: user.email, firstName: user.firstName },
        {
          shareId: link.id,
          recipient: link.recipient,
          personName: opened.personName,
          device: opened.device,
          openedAt: opened.at,
        },
      );
    }
    if (wants.push && this.push) {
      for (const device of await this.settings.devices(userId)) {
        const result = await this.push.send(device, {
          title: `${link.recipient}'s link was opened`,
          body: `${opened.personName}'s records · ${opened.device}`,
          url: `/shares/${link.id}`,
          tag: `share-${link.id}`,
        });
        if (result === "gone") {
          await this.settings.forgetEndpoint(device.endpoint);
        }
      }
    }
  }
}
