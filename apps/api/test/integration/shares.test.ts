import { describe, expect, it } from "vitest";
import { JPG } from "../fixtures/files.js";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const inDays = (days: number) =>
  new Date(t.clock.now().getTime() + days * DAY).toISOString();

async function addRecord(browser: Browser, more: object = {}) {
  const response = await browser.post("/api/records").send({
    ownerId: USERS.maria.id,
    type: "lab",
    title: "CBC",
    recordDate: "2026-10-15",
    details: {
      results: [{ name: "Hemoglobin", value: "12.5", unit: "g/dL" }],
    },
    ...more,
  });
  expect(response.status).toBe(201);
  return response.body.record.id as string;
}

async function attachPhoto(browser: Browser, recordId: string) {
  const target = await browser.post(
    `/api/records/${recordId}/files/upload-target`,
  );
  const stored = await browser
    .put(target.body.target.url)
    .set("Content-Type", "application/octet-stream")
    .send(JPG);
  const file = await browser
    .post(`/api/records/${recordId}/files`)
    .send({ upload: stored.body, name: "cbc.jpg" });
  return file.body.file.id as string;
}

async function makeLink(browser: Browser, more: object = {}) {
  const response = await browser.post("/api/shares").send({
    recipient: "Dr. Reyes",
    expiresAt: inDays(7),
    ...more,
  });
  return response;
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

// A doctor's browser: no sign-in
const doctor = (device = "Mozilla/5.0 (Linux; Android 14) Chrome/130.0") => {
  const agent = t.api();
  agent.set("User-Agent", device);
  return agent;
};

describe("a link for a doctor", () => {
  it("opens only what was chosen, without signing in", async () => {
    const maria = await t.as("maria");
    const cbc = await addRecord(maria);
    const xray = await addRecord(maria, {
      type: "imaging",
      title: "Chest X-ray",
      details: { bodyPart: "Chest", reading: "Clear" },
    });
    await maria.put("/api/medical-id").send({ fields: { bloodType: "O+" } });

    const made = await makeLink(maria, {
      recordIds: [cbc],
      labs: true,
      medicalId: true,
      note: "For my check-up on Friday",
    });
    expect(made.status).toBe(201);
    const link = made.body.link;
    expect(link).toMatchObject({
      personName: "Maria Lopez Santos",
      recipient: "Dr. Reyes",
      hasPin: false,
      status: "open",
      records: [{ id: cbc, title: "CBC" }],
      views: [],
    });
    expect(link.token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const doc = doctor();
    const gate = await doc.get(`/api/shared/${link.token}`);
    expect(gate.status).toBe(200);
    expect(gate.headers["cache-control"]).toBe("no-store");
    expect(gate.body).toEqual({ gate: { needsPin: false, waitUntil: null } });

    const opened = await doc.post(`/api/shared/${link.token}/open`).send({});
    expect(opened.status).toBe(200);
    expect(opened.headers["set-cookie"][0]).toMatch(
      new RegExp(`^talaan\\.sv=.+Path=/api/shared/${link.token};.*HttpOnly`),
    );
    const page = opened.body.page;
    expect(page).toMatchObject({
      recipient: "Dr. Reyes",
      sharedByName: "Maria Lopez Santos",
      personName: "Maria Lopez Santos",
      note: "For my check-up on Friday",
      preview: false,
    });
    expect(page.medicalId.bloodType).toBe("O+");
    expect(page.labs.map((l: { recordId: string }) => l.recordId)).toEqual([
      cbc,
    ]);
    expect(page.records.map((r: { id: string }) => r.id)).toEqual([cbc]);
    expect(page.records[0].createdByName).toBeNull();
    expect(JSON.stringify(page)).not.toContain(xray);

    // The same browser comes back later
    const again = await doc.get(`/api/shared/${link.token}`);
    expect(again.body.page.records).toHaveLength(1);

    // The family is told, and sees who opened it
    expect(t.emails.shareOpened).toHaveLength(1);
    expect(t.emails.shareOpened[0]).toMatchObject({
      to: { email: USERS.maria.email },
      opened: {
        recipient: "Dr. Reyes",
        personName: "Maria Lopez Santos",
        device: "Chrome on Android",
      },
    });
    const seen = (await maria.get(`/api/shares/${link.id}`)).body.link;
    expect(seen.views).toEqual([
      { openedAt: t.clock.now().toISOString(), device: "Chrome on Android" },
    ]);
    const activity = (await maria.get("/api/activity")).body.entries;
    expect(activity.map((e: { action: string }) => e.action)).toEqual(
      expect.arrayContaining(["share.created", "share.opened"]),
    );
  });

  it("asks for the PIN, and waits after too many wrong ones", async () => {
    const maria = await t.as("maria");
    const link = (await makeLink(maria, { medicalId: true, pin: "482913" }))
      .body.link;
    expect(link.hasPin).toBe(true);

    const doc = doctor();
    expect((await doc.get(`/api/shared/${link.token}`)).body.gate).toEqual({
      needsPin: true,
      waitUntil: null,
    });
    const wrong = await doc
      .post(`/api/shared/${link.token}/open`)
      .send({ pin: "111111" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors.pin[0]).toContain("4 tries left");
    expect(
      (await doc.post(`/api/shared/${link.token}/open`).send({})).status,
    ).toBe(400);

    const right = await doc
      .post(`/api/shared/${link.token}/open`)
      .send({ pin: "482913" });
    expect(right.status).toBe(200);
    expect(right.body.page.medicalId).not.toBeNull();

    // Another browser guessing
    const guesser = doctor();
    for (let i = 0; i < 4; i++) {
      await guesser
        .post(`/api/shared/${link.token}/open`)
        .send({ pin: "000000" });
    }
    const locked = await guesser
      .post(`/api/shared/${link.token}/open`)
      .send({ pin: "000000" });
    expect(locked.status).toBe(429);
    // Even the right PIN waits
    expect(
      (
        await guesser
          .post(`/api/shared/${link.token}/open`)
          .send({ pin: "482913" })
      ).status,
    ).toBe(429);
    expect(
      (await guesser.get(`/api/shared/${link.token}`)).body.gate.waitUntil,
    ).not.toBeNull();
    // The browser that already opened it isn't affected
    expect((await doc.get(`/api/shared/${link.token}`)).body.page).toBeTruthy();

    t.clock.advance(16 * MINUTE);
    expect(
      (
        await guesser
          .post(`/api/shared/${link.token}/open`)
          .send({ pin: "482913" })
      ).status,
    ).toBe(200);
  });

  it("can be opened only so many times", async () => {
    const maria = await t.as("maria");
    const link = (await makeLink(maria, { medicalId: true, maxViews: 1 })).body
      .link;
    const first = doctor();
    expect(
      (await first.post(`/api/shared/${link.token}/open`).send({})).status,
    ).toBe(200);
    const second = await doctor()
      .post(`/api/shared/${link.token}/open`)
      .send({});
    expect(second.status).toBe(410);
    expect(
      (await first.get(`/api/shared/${link.token}`)).body.page,
    ).toBeTruthy();
    expect((await maria.get(`/api/shares/${link.id}`)).body.link.status).toBe(
      "used",
    );
  });

  it("stops working when stopped or when it ends", async () => {
    let maria = await t.as("maria");
    const stopped = (await makeLink(maria, { medicalId: true })).body.link;
    const doc = doctor();
    await doc.post(`/api/shared/${stopped.token}/open`).send({});
    const stop = await maria.post(`/api/shares/${stopped.id}/stop`);
    expect(stop.body.link).toMatchObject({
      status: "stopped",
      stoppedByName: "Maria Lopez Santos",
    });
    const after = await doc.get(`/api/shared/${stopped.token}`);
    expect(after.status).toBe(404);
    expect(after.body.message).toContain("ended or was stopped");

    const short = (
      await makeLink(maria, {
        medicalId: true,
        expiresAt: new Date(
          t.clock.now().getTime() + 60 * MINUTE,
        ).toISOString(),
      })
    ).body.link;
    const doc2 = doctor();
    expect(
      (await doc2.post(`/api/shared/${short.token}/open`).send({})).status,
    ).toBe(200);
    t.clock.advance(61 * MINUTE);
    expect((await doc2.get(`/api/shared/${short.token}`)).status).toBe(404);
    // Signed out by then (15 minutes without use); sign in again
    maria = await t.as("maria");
    expect((await maria.get(`/api/shares/${short.id}`)).body.link.status).toBe(
      "expired",
    );

    // Ended links can be taken off the list; open ones must be stopped first
    const open = (await makeLink(maria, { medicalId: true })).body.link;
    expect((await maria.delete(`/api/shares/${open.id}`)).status).toBe(400);
    expect((await maria.delete(`/api/shares/${short.id}`)).status).toBe(204);
    expect(
      (await maria.get("/api/shares")).body.links.map(
        (l: { id: string }) => l.id,
      ),
    ).toEqual([open.id, stopped.id]);
    expect((await doctor().get("/api/shared/not-a-real-code")).status).toBe(
      404,
    );
  });

  it("serves the photos of the records in it, and only those", async () => {
    const maria = await t.as("maria");
    const shared = await addRecord(maria);
    const other = await addRecord(maria, { title: "Urinalysis" });
    const photo = await attachPhoto(maria, shared);
    const hidden = await attachPhoto(maria, other);
    const link = (await makeLink(maria, { recordIds: [shared] })).body.link;

    const doc = doctor();
    const url = (id: string) => `/api/shared/${link.token}/files/${id}/content`;
    // Not before it's opened
    expect((await doc.get(url(photo))).status).toBe(404);

    const page = (await doc.post(`/api/shared/${link.token}/open`).send({}))
      .body.page;
    expect(page.records[0].files.map((f: { id: string }) => f.id)).toEqual([
      photo,
    ]);
    const file = await doc.get(url(photo)).query({ download: "1" });
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/jpeg");
    expect(file.headers["content-disposition"]).toMatch(/^attachment/);
    expect((await doc.get(url(hidden))).status).toBe(404);

    // A record moved to the Trash leaves the link
    await maria.delete(`/api/records/${shared}`);
    expect((await doc.get(url(photo))).status).toBe(404);
    expect(
      (await doc.get(`/api/shared/${link.token}`)).body.page.records,
    ).toEqual([]);
  });

  it("tells the family at most every half hour", async () => {
    let maria = await t.as("maria");
    await maria.post("/api/account/alerts/devices").send({
      endpoint: "https://push.example.com/maria-phone",
      keys: { p256dh: "key", auth: "auth" },
      label: "Chrome on Android",
    });
    const link = (await makeLink(maria, { medicalId: true })).body.link;
    await doctor().post(`/api/shared/${link.token}/open`).send({});
    await doctor("Safari on iPhone (iPhone) Safari/605")
      .post(`/api/shared/${link.token}/open`)
      .send({});
    expect(t.emails.shareOpened).toHaveLength(1);
    expect(t.push.sent).toHaveLength(1);
    expect(t.push.sent[0].message).toMatchObject({
      title: "Dr. Reyes's link was opened",
      url: `/shares/${link.id}`,
    });

    t.clock.advance(31 * MINUTE);
    await doctor().post(`/api/shared/${link.token}/open`).send({});
    expect(t.emails.shareOpened).toHaveLength(2);
    maria = await t.as("maria");
    expect(
      (await maria.get(`/api/shares/${link.id}`)).body.link.views,
    ).toHaveLength(3);

    // Alerts follow each person's settings
    await maria.put("/api/account/alerts").send({ email: false, push: false });
    t.clock.advance(31 * MINUTE);
    await doctor().post(`/api/shared/${link.token}/open`).send({});
    expect(t.emails.shareOpened).toHaveLength(2);
  });
});

describe("who can make links", () => {
  it("lets family who can manage make them, and shows them a preview", async () => {
    const { maria, ana } = await share("manage");
    const made = await makeLink(ana, {
      ownerId: USERS.maria.id,
      medicalId: true,
      pin: "123456",
    });
    expect(made.status).toBe(201);
    expect(made.body.link.createdByName).toBe("Ana Reyes");

    // Family opening it: no PIN, not counted, nobody told
    const preview = await maria.get(`/api/shared/${made.body.link.token}`);
    expect(preview.body.page.preview).toBe(true);
    expect(t.emails.shareOpened).toHaveLength(0);

    // A doctor opening it tells both the owner and Ana
    await doctor()
      .post(`/api/shared/${made.body.link.token}/open`)
      .send({ pin: "123456" });
    expect(t.emails.shareOpened.map((e) => e.to.email).sort()).toEqual([
      USERS.ana.email,
      USERS.maria.email,
    ]);
  });

  it("doesn't let view-only family or strangers make or see them", async () => {
    const { maria, ana } = await share("view");
    const link = (await makeLink(maria, { medicalId: true })).body.link;
    expect(
      (await makeLink(ana, { ownerId: USERS.maria.id, medicalId: true }))
        .status,
    ).toBe(403);
    expect(
      (await ana.get(`/api/shares?ownerId=${USERS.maria.id}`)).status,
    ).toBe(403);
    expect((await ana.get(`/api/shares/${link.id}`)).status).toBe(404);
    expect((await ana.post(`/api/shares/${link.id}/stop`)).status).toBe(404);
    expect((await t.api().get("/api/shares")).status).toBe(401);
  });

  it("checks what's chosen and how long it lasts", async () => {
    const maria = await t.as("maria");
    const nothing = await makeLink(maria, {});
    expect(nothing.status).toBe(400);
    expect(nothing.body.errors.what).toBeDefined();
    expect(
      (await makeLink(maria, { medicalId: true, expiresAt: inDays(400) })).body
        .errors.expiresAt,
    ).toBeDefined();
    expect(
      (await makeLink(maria, { medicalId: true, expiresAt: inDays(-1) })).body
        .errors.expiresAt,
    ).toBeDefined();

    // A record of someone else in the family isn't Maria's to put in her link
    const lia = (
      await maria
        .post("/api/family/profiles")
        .send({ firstName: "Lia", lastName: "Santos", relationship: "Anak" })
    ).body.profile.id;
    const hers = await addRecord(maria, { profileId: lia });
    const wrong = await makeLink(maria, { recordIds: [hers] });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors.recordIds).toBeDefined();
    const right = await makeLink(maria, { profileId: lia, recordIds: [hers] });
    expect(right.body.link).toMatchObject({
      personName: "Lia Santos",
      records: [{ id: hers }],
    });
  });

  it("can last longer, change its PIN, or drop it", async () => {
    const maria = await t.as("maria");
    const link = (await makeLink(maria, { medicalId: true, pin: "111111" }))
      .body.link;
    const changed = await maria
      .put(`/api/shares/${link.id}/settings`)
      .send({ expiresAt: inDays(30), maxViews: 5, pin: "222222" });
    expect(changed.status).toBe(200);
    expect(changed.body.link).toMatchObject({ hasPin: true, maxViews: 5 });

    const doc = doctor();
    expect(
      (await doc.post(`/api/shared/${link.token}/open`).send({ pin: "111111" }))
        .status,
    ).toBe(400);
    expect(
      (await doc.post(`/api/shared/${link.token}/open`).send({ pin: "222222" }))
        .status,
    ).toBe(200);

    const noPin = await maria
      .put(`/api/shares/${link.id}/settings`)
      .send({ expiresAt: inDays(30), maxViews: null, pin: "" });
    expect(noPin.body.link.hasPin).toBe(false);
    expect(
      (await doctor().post(`/api/shared/${link.token}/open`).send({})).status,
    ).toBe(200);

    const history = (await maria.get("/api/activity")).body.entries
      .filter((e: { action: string }) => e.action === "share.changed")
      .at(-1);
    expect(history.changes.map((c: { field: string }) => c.field)).toEqual([
      "Until",
      "Most opens",
      "PIN",
    ]);
  });
});
