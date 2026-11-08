import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;

// Philippine time
const ph = (text: string) => new Date(`${text}:00+08:00`);

const medicine = {
  ownerId: USERS.maria.id,
  kind: "medicine",
  title: "Metformin",
  dose: "500 mg, 1 tablet after meals",
  schedule: {
    start: "2026-11-10",
    times: ["08:00", "20:00"],
    repeat: { every: "day", interval: 1 },
    end: { type: "count", count: 6 },
  },
  alerts: [0, 30],
};

async function addReminder(browser: Browser, fields: object = medicine) {
  const response = await browser.post("/api/reminders").send(fields);
  expect(response.status).toBe(201);
  return response.body.reminder as { id: string };
}

async function share(access: "view" | "manage") {
  const maria = await t.as("maria");
  await maria
    .post("/api/family/invitations")
    .send({ email: USERS.ana.email, relationship: "Anak", access });
  const ana = await t.as("ana");
  await ana
    .post("/api/family/invitations/accept")
    .send({ token: t.emails.invitations.at(-1)!.invitation.token });
  return { maria, ana };
}

// The server's minute: moves the clock, then sends what's due
async function sendAt(text: string) {
  t.clock.set(ph(text));
  return await t.app.sendDueReminderAlerts();
}

const emailed = () =>
  t.emails.reminders.map(
    (e) =>
      `${e.to.firstName}: ${e.alert.title} ${e.alert.occursAt.toISOString()} ${e.alert.minutesBefore}`,
  );

describe("reminders", () => {
  it("adds a reminder and shows what's coming", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    const shown = (await maria.get(`/api/reminders/${id}`)).body.reminder;
    expect(shown).toMatchObject({
      title: "Metformin",
      kind: "medicine",
      personName: "Maria Lopez Santos",
      role: "owner",
      paused: false,
      mutedByMe: false,
      alerts: [0, 30],
      nextAt: ph("2026-11-10 08:00").toISOString(),
    });
    expect(shown.upcoming.map((u: { at: string }) => u.at)).toEqual(
      [
        "2026-11-10 08:00",
        "2026-11-10 20:00",
        "2026-11-11 08:00",
        "2026-11-11 20:00",
        "2026-11-12 08:00",
      ].map((x) => ph(x).toISOString()),
    );
    const list = (await maria.get("/api/reminders")).body;
    expect(list.reminders).toHaveLength(1);
  });

  it("doesn't count times from before it was made as missed", async () => {
    // Made at 9 PM: this morning's 8 AM isn't listed, tonight's is gone too
    t.clock.set(ph("2026-11-10 21:00"));
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    const agenda = (
      await maria.get(
        `/api/reminders/agenda?from=${ph("2026-11-10 00:00").toISOString()}&to=${ph("2026-11-12 00:00").toISOString()}`,
      )
    ).body;
    expect(agenda.items.map((i: { at: string }) => i.at)).toEqual([
      ph("2026-11-11 08:00").toISOString(),
      ph("2026-11-11 20:00").toISOString(),
    ]);
    expect(
      (await maria.get(`/api/reminders/${id}`)).body.reminder.recent,
    ).toEqual([]);
  });

  it("checks the schedule like the form does", async () => {
    const maria = await t.as("maria");
    const response = await maria.post("/api/reminders").send({
      ...medicine,
      schedule: {
        ...medicine.schedule,
        repeat: { every: "week", interval: 1, weekdays: [] },
      },
    });
    expect(response.status).toBe(400);
    expect(response.body.errors["schedule.repeat.weekdays"]).toEqual([
      "Choose at least one day",
    ]);
  });

  it("lists every time ahead, and marks times done, skipped or snoozed", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    const act = (at: string, action: object) =>
      maria
        .post(`/api/reminders/${id}/occurrences`)
        .send({ at: ph(at).toISOString(), ...action });

    expect((await act("2026-11-10 08:00", { action: "done" })).status).toBe(
      204,
    );
    expect((await act("2026-11-10 20:00", { action: "skip" })).status).toBe(
      204,
    );
    const snooze = await act("2026-11-11 08:00", {
      action: "snooze",
      until: ph("2026-11-11 09:00").toISOString(),
    });
    expect(snooze.status).toBe(204);
    const notATime = await act("2026-11-10 09:00", { action: "done" });
    expect(notATime.status).toBe(400);
    expect(notATime.body.errors.at).toBeDefined();

    const agenda = (
      await maria.get(
        `/api/reminders/agenda?from=${ph("2026-11-10 00:00").toISOString()}&to=${ph("2026-11-12 00:00").toISOString()}`,
      )
    ).body;
    expect(
      agenda.items.map(
        (i: { at: string; state: string | null; byName: string | null }) => [
          i.at,
          i.state,
          i.byName,
        ],
      ),
    ).toEqual([
      [ph("2026-11-10 08:00").toISOString(), "done", "Maria Lopez Santos"],
      [ph("2026-11-10 20:00").toISOString(), "skipped", "Maria Lopez Santos"],
      [ph("2026-11-11 08:00").toISOString(), "snoozed", "Maria Lopez Santos"],
      [ph("2026-11-11 20:00").toISOString(), null, null],
    ]);

    // Undo
    await act("2026-11-10 08:00", { action: "clear" });
    const again = (await maria.get(`/api/reminders/${id}`)).body.reminder;
    expect(again.nextAt).toBe(ph("2026-11-10 08:00").toISOString());
  });
});

describe("reminder alerts", () => {
  it("sends each alert once, by email and to the browser, to everyone shared", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const { maria } = await share("view");
    await maria.post("/api/account/alerts/devices").send({
      endpoint: "https://push.example.com/maria-phone",
      keys: { p256dh: "key", auth: "auth" },
      label: "Chrome on Android",
    });
    await addReminder(maria);

    expect(await sendAt("2026-11-10 07:29")).toBe(0);
    await sendAt("2026-11-10 07:30");
    expect(emailed()).toEqual([
      `Maria: Metformin ${ph("2026-11-10 08:00").toISOString()} 30`,
      `Ana: Metformin ${ph("2026-11-10 08:00").toISOString()} 30`,
    ]);
    expect(t.push.sent).toHaveLength(1);
    expect(t.push.sent[0].message).toMatchObject({
      title: "Metformin",
      url: expect.stringMatching(/^\/reminders\//),
    });
    expect(t.push.sent[0].message.body).toContain("In 30 minutes · 8:00 AM");

    // Running again sends nothing new
    await sendAt("2026-11-10 07:31");
    expect(t.emails.reminders).toHaveLength(2);
    await sendAt("2026-11-10 08:00");
    expect(t.emails.reminders).toHaveLength(4);
  });

  it("lets each person turn alerts off for themselves", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const { maria, ana } = await share("view");
    const { id } = await addReminder(maria);
    expect(
      (await ana.put(`/api/reminders/${id}/my-alerts`).send({ muted: true }))
        .status,
    ).toBe(204);
    // Maria keeps browser alerts but turns email off
    await maria.put("/api/account/alerts").send({ email: false, push: true });
    await sendAt("2026-11-10 07:30");
    expect(t.emails.reminders).toEqual([]);

    // Hours later: Ana signs in again (her old session locked)
    const anaLater = await t.as("ana");
    await anaLater.put(`/api/reminders/${id}/my-alerts`).send({ muted: false });
    await sendAt("2026-11-10 08:00");
    expect(emailed()).toEqual([
      `Ana: Metformin ${ph("2026-11-10 08:00").toISOString()} 0`,
    ]);
  });

  it("sends nothing for a time already done, and once when a snooze ends", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    await maria.post(`/api/reminders/${id}/occurrences`).send({
      at: ph("2026-11-10 08:00").toISOString(),
      action: "done",
    });
    await sendAt("2026-11-10 08:00");
    expect(t.emails.reminders).toEqual([]);

    await sendAt("2026-11-10 20:00");
    expect(t.emails.reminders).toHaveLength(1);
    t.clock.set(ph("2026-11-10 20:01"));
    const later = await t.as("maria");
    await later.post(`/api/reminders/${id}/occurrences`).send({
      at: ph("2026-11-10 20:00").toISOString(),
      action: "snooze",
      until: ph("2026-11-10 20:10").toISOString(),
    });
    await sendAt("2026-11-10 20:09");
    expect(t.emails.reminders).toHaveLength(1);
    await sendAt("2026-11-10 20:10");
    expect(t.emails.reminders.at(-1)?.alert.minutesBefore).toBeNull();
  });

  it("after a long sleep, sends only the latest alert, and skips old ones", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    await addReminder(maria);
    // Asleep until 9 AM: the 7:30 and 8:00 alerts were missed. 8:00 is
    // within 3 hours, so only that one goes out.
    await sendAt("2026-11-10 09:00");
    expect(emailed()).toEqual([
      `Maria: Metformin ${ph("2026-11-10 08:00").toISOString()} 0`,
    ]);
    // Asleep all day: nothing from the morning is sent at 11:59 PM
    t.emails.clear();
    await sendAt("2026-11-10 23:59");
    expect(t.emails.reminders).toEqual([]);
  });

  it("stops while paused, without a backlog when resumed", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    expect((await maria.post(`/api/reminders/${id}/pause`)).status).toBe(204);
    await sendAt("2026-11-10 08:00");
    expect(t.emails.reminders).toEqual([]);
    const later = await t.as("maria");
    await later.post(`/api/reminders/${id}/resume`);
    await sendAt("2026-11-10 08:05");
    expect(t.emails.reminders).toEqual([]);
    await sendAt("2026-11-10 19:30");
    expect(t.emails.reminders).toHaveLength(1);
  });

  it("forgets a browser that turned notifications off", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const maria = await t.as("maria");
    await maria.post("/api/account/alerts/devices").send({
      endpoint: "https://push.example.com/gone-laptop",
      keys: { p256dh: "key", auth: "auth" },
    });
    expect((await maria.get("/api/account/alerts")).body).toMatchObject({
      email: true,
      push: true,
      pushKey: "test-public-key",
      devices: [{ label: "" }],
    });
    await addReminder(maria);
    await sendAt("2026-11-10 07:30");
    const after = await t.as("maria");
    expect((await after.get("/api/account/alerts")).body.devices).toEqual([]);
  });
});

describe("who can do what with reminders", () => {
  it("lets “Can view” family look and mute, not change", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const { maria, ana } = await share("view");
    const { id } = await addReminder(maria);
    expect((await ana.get(`/api/reminders/${id}`)).body.reminder.role).toBe(
      "view",
    );
    expect((await ana.post("/api/reminders").send(medicine)).status).toBe(403);
    expect((await ana.put(`/api/reminders/${id}`).send(medicine)).status).toBe(
      403,
    );
    expect(
      (
        await ana.post(`/api/reminders/${id}/occurrences`).send({
          at: ph("2026-11-10 08:00").toISOString(),
          action: "done",
        })
      ).status,
    ).toBe(403);
  });

  it("lets “Can manage” family change and pause, but only the owner remove", async () => {
    t.clock.set(ph("2026-11-09 20:00"));
    const { maria, ana } = await share("manage");
    const { id } = await addReminder(ana);
    const edited = await ana
      .put(`/api/reminders/${id}`)
      .send({ ...medicine, title: "Metformin 500" });
    expect(edited.status).toBe(200);
    expect((await ana.post(`/api/reminders/${id}/pause`)).status).toBe(204);
    expect((await ana.delete(`/api/reminders/${id}`)).status).toBe(403);
    expect((await maria.delete(`/api/reminders/${id}`)).status).toBe(204);
    expect((await maria.get(`/api/reminders/${id}`)).status).toBe(404);

    const activity = (await maria.get("/api/activity")).body.entries.map(
      (e: { action: string; subject: string }) => `${e.action}: ${e.subject}`,
    );
    expect(activity).toEqual(
      expect.arrayContaining([
        "reminder.created: Metformin",
        "reminder.edited: Metformin 500",
        "reminder.paused: Metformin 500",
        "reminder.removed: Metformin 500",
      ]),
    );
  });

  it("hides reminders from everyone they aren't shared with", async () => {
    const maria = await t.as("maria");
    const { id } = await addReminder(maria);
    const ana = await t.as("ana");
    expect((await ana.get(`/api/reminders/${id}`)).status).toBe(404);
    expect(
      (await ana.get(`/api/reminders?ownerId=${USERS.maria.id}`)).status,
    ).toBe(404);
    expect(
      (await ana.put(`/api/reminders/${id}/my-alerts`).send({ muted: true }))
        .status,
    ).toBe(404);
  });

  it("links a reminder to a record of the same account only", async () => {
    const ana = await t.as("ana");
    const record = (
      await ana.post("/api/records").send({
        ownerId: USERS.ana.id,
        type: "lab",
        title: "FBS",
        recordDate: "2026-10-01",
      })
    ).body.record;
    const maria = await t.as("maria");
    const response = await maria
      .post("/api/reminders")
      .send({ ...medicine, recordId: record.id });
    expect(response.status).toBe(404);
  });
});
