import { describeAlert, fullName, REMINDER_KIND_LABELS } from "@talaan/shared";
import {
  dueAlerts,
  latestPerOccurrence,
  nextAlertAt,
} from "../../domain/reminder/alertPlan.js";
import type { Reminder } from "../../domain/reminder/Reminder.js";
import type {
  AlertSettingsRepository,
  ReminderRepository,
} from "../../domain/reminder/ReminderRepository.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { AccountEmails, ReminderAlert } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { PushSender } from "../ports/PushSender.js";

const HOUR = 60 * 60 * 1000;
// Alerts older than this aren't sent (the server was asleep): too late to help
const STALE = 3 * HOUR;
// Reminders handled per run (the rest wait for the next minute)
const BATCH = 50;

const timeText = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);

// Sends the alerts that are due, by email and browser notification, to the
// owner and everyone the account is shared with who wants them. Each alert
// goes out once per person and way (claimed in the database first), even if
// the server restarts or two runs overlap.
export class ReminderAlerts {
  constructor(
    private readonly reminders: ReminderRepository,
    private readonly settings: AlertSettingsRepository,
    private readonly users: UserRepository,
    private readonly profiles: FamilyProfileRepository,
    private readonly emails: AccountEmails | null,
    private readonly push: PushSender | null,
    private readonly clock: Clock,
  ) {}

  private async personName(reminder: Reminder) {
    if (reminder.profileId) {
      const profiles = await this.profiles.listForOwners([reminder.ownerId]);
      const profile = profiles.find((p) => p.id === reminder.profileId);
      if (profile) return fullName(profile);
    }
    const owner = await this.users.findById(reminder.ownerId);
    return owner ? fullName(owner) : "";
  }

  // Returns how many alerts went out
  async sendDue(): Promise<number> {
    const now = this.clock.now();
    let sent = 0;
    for (const reminder of await this.reminders.dueForAlerts(now, BATCH)) {
      try {
        sent += await this.sendFor(reminder, now);
      } catch (error) {
        console.error(
          `Couldn't send alerts for reminder ${reminder.id}:`,
          error,
        );
      }
    }
    // Delivery notes are only needed while an alert could still be sent again
    await this.reminders.forgetDeliveriesBefore(
      new Date(now.getTime() - 40 * 24 * HOUR),
    );
    return sent;
  }

  private async sendFor(reminder: Reminder, now: Date) {
    const from = new Date(
      Math.max(reminder.alertsCheckedUntil.getTime(), now.getTime() - STALE),
    );
    const states = await this.reminders.occurrences(
      [reminder.id],
      new Date(from.getTime() - 31 * 24 * HOUR),
    );
    const alerts = latestPerOccurrence(dueAlerts(reminder, states, from, now));
    let sent = 0;
    if (alerts.length > 0) {
      const people = await this.reminders.recipients(
        reminder.id,
        reminder.ownerId,
      );
      const personName = await this.personName(reminder);
      for (const due of alerts) {
        const alert: ReminderAlert = {
          reminderId: reminder.id,
          kind: reminder.kind,
          title: reminder.title,
          dose: reminder.dose,
          note: reminder.note,
          personName,
          occursAt: due.occursAt,
          minutesBefore: due.minutesBefore,
        };
        for (const person of people) {
          const claim = (channel: "email" | "push") =>
            this.reminders.claimDelivery({
              reminderId: reminder.id,
              occursAt: due.occursAt,
              alertAt: due.alertAt,
              userId: person.userId,
              channel,
            });
          if (person.wantsEmail && this.emails && (await claim("email"))) {
            await this.emails
              .sendReminderAlert(
                { email: person.email, firstName: person.firstName },
                alert,
              )
              .then(() => sent++)
              .catch((error) =>
                console.error(`Couldn't email a reminder alert:`, error),
              );
          }
          if (person.wantsPush && this.push && (await claim("push"))) {
            sent += await this.pushTo(person.userId, alert);
          }
        }
      }
    }
    await this.reminders.setPlan(reminder.id, {
      checkedUntil: now,
      nextAlertAt: nextAlertAt(reminder, states, now),
    });
    return sent;
  }

  private async pushTo(userId: string, alert: ReminderAlert) {
    if (!this.push) return 0;
    const lead =
      alert.minutesBefore === null || alert.minutesBefore === 0
        ? "Now"
        : `In ${describeAlert(alert.minutesBefore).replace(/ before$/, "")}`;
    const body = [
      `${lead} · ${timeText(alert.occursAt)}`,
      `${REMINDER_KIND_LABELS[alert.kind]} for ${alert.personName}`,
      alert.dose,
    ]
      .filter(Boolean)
      .join("\n");
    let sent = 0;
    for (const device of await this.settings.devices(userId)) {
      try {
        const result = await this.push.send(device, {
          title: alert.title,
          body,
          url: `/reminders/${alert.reminderId}`,
          tag: `${alert.reminderId}|${alert.occursAt.toISOString()}`,
        });
        if (result === "gone")
          await this.settings.forgetEndpoint(device.endpoint);
        else sent++;
      } catch (error) {
        console.error("Couldn't send a browser notification:", error);
      }
    }
    return sent;
  }
}
