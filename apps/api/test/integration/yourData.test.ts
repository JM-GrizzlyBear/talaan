import { readdirSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { JPG } from "../fixtures/files.js";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;
const DAY = 24 * 60 * 60 * 1000;

// Every file kept in the test storage
const storedFiles = () =>
  readdirSync(t.uploadsDir, { recursive: true, withFileTypes: true }).filter(
    (f) => f.isFile(),
  ).length;

async function fill(maria: Browser) {
  const record = (
    await maria.post("/api/records").send({
      ownerId: USERS.maria.id,
      type: "lab",
      title: "CBC",
      recordDate: "2026-10-05",
      facility: "St. Luke's",
      notes: "=SUM(1,2) should stay text",
      details: {
        results: [
          {
            name: "Hemoglobin",
            value: "11.2",
            unit: "g/dL",
            rangeLow: 12,
            rangeHigh: 16,
          },
        ],
      },
    })
  ).body.record;
  const target = await maria.post(
    `/api/records/${record.id}/files/upload-target`,
  );
  const stored = await maria
    .put(target.body.target.url)
    .set("Content-Type", "application/octet-stream")
    .send(JPG);
  await maria
    .post(`/api/records/${record.id}/files`)
    .send({ upload: stored.body, name: "cbc printout.jpg" });
  await maria
    .post("/api/places")
    .send({ ownerId: USERS.maria.id, kind: "box", name: "Blue box" });
  await maria.put("/api/medical-id").send({
    fields: {
      bloodType: "O+",
      allergies: [{ name: "Penicillin", severity: "severe", reaction: "" }],
    },
  });
  return record as { id: string };
}

async function download(browser: Browser) {
  const response = await browser
    .get("/api/account/export")
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => done(null, Buffer.concat(chunks)));
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

describe("downloading your data", () => {
  it("gives one ZIP: a page, spreadsheets, JSON and every file", async () => {
    const maria = await t.as("maria");
    await fill(maria);
    const response = await download(maria);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/zip");
    expect(response.headers["content-disposition"]).toContain(
      "Talaan Maria Lopez Santos",
    );

    const zip = unzipSync(new Uint8Array(response.body as Buffer));
    const names = Object.keys(zip).map((n) => n.split("/").slice(1).join("/"));
    expect(names).toEqual(
      expect.arrayContaining([
        "Read me.txt",
        "Open me.html",
        "records.csv",
        "lab-results.csv",
        "reminders.csv",
        "talaan-data.json",
        "Photos and PDFs/Maria Lopez Santos/2026-10-05 CBC/1 cbc printout.jpg",
      ]),
    );
    const file = (end: string) =>
      zip[Object.keys(zip).find((n) => n.endsWith(end))!];
    expect(Buffer.from(file(".jpg")).equals(JPG)).toBe(true);

    const page = strFromU8(file("Open me.html"));
    expect(page).toContain("CBC");
    expect(page).toContain("Penicillin");
    expect(page).toContain(
      'href="Photos%20and%20PDFs/Maria%20Lopez%20Santos/2026-10-05%20CBC/1%20cbc%20printout.jpg"',
    );

    const records = strFromU8(file("records.csv"));
    // With a BOM, so Excel reads ñ right
    expect([...file("records.csv").slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(records).toContain("Person,Type,Title");
    // A formula stays text in a spreadsheet
    expect(records).toContain(`"'=SUM(1,2) should stay text"`);
    expect(strFromU8(file("lab-results.csv"))).toContain(
      "Hemoglobin,11.2,g/dL,12,16,Low",
    );

    const data = JSON.parse(strFromU8(file("talaan-data.json")));
    expect(data.account.email).toBe(USERS.maria.email);
    expect(data.records[0].files[0].pathInThisZip).toContain("cbc printout");
    expect(data.places[0].name).toBe("Blue box");
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|pinHash|\$2[aby]\$/);

    // Told by email, and in the history
    expect(t.emails.notices.map((n) => n.notice.kind)).toEqual(["exported"]);
    const activity = (await maria.get("/api/activity")).body.entries;
    expect(activity[0].action).toBe("account.exported");
  });

  it("has only your own account, not ones shared with you", async () => {
    const { ana } = await share("manage");
    const maria = await t.as("maria");
    await fill(maria);
    const zip = unzipSync(new Uint8Array((await download(ana)).body as Buffer));
    const data = JSON.parse(
      strFromU8(zip[Object.keys(zip).find((n) => n.endsWith(".json"))!]),
    );
    expect(data.account.email).toBe(USERS.ana.email);
    expect(data.records).toEqual([]);
    expect(data.familySharing.sharedWithYou[0].name).toBe("Maria Lopez Santos");
    expect((await t.api().get("/api/account/export")).status).toBe(401);
  });
});

describe("deleting your account", () => {
  it("suspends it: nobody sees anything, and signing in brings it back", async () => {
    const { maria, ana } = await share("view");
    await fill(maria);
    const qr = await maria
      .put("/api/medical-id/emergency")
      .send({ on: true, extras: [] });
    const token = qr.body.medicalId.emergency.token;
    const link = (
      await maria.post("/api/shares").send({
        recipient: "Dr. Reyes",
        medicalId: true,
        expiresAt: new Date(t.clock.now().getTime() + 7 * DAY).toISOString(),
      })
    ).body.link;

    const wrong = await maria
      .post("/api/account/delete")
      .send({ mode: "suspend", password: "not-the-password" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors.password).toBeDefined();

    const done = await maria
      .post("/api/account/delete")
      .send({ mode: "suspend", password: PASSWORD });
    expect(done.status).toBe(200);
    expect(new Date(done.body.deleteAfter).getTime()).toBe(
      t.clock.now().getTime() + 365 * DAY,
    );
    // Signed out
    expect((await maria.get("/api/auth/me")).status).toBe(401);
    expect(t.emails.notices.map((n) => [n.to.email, n.notice.kind])).toEqual([
      [USERS.maria.email, "suspended"],
      [USERS.ana.email, "sharingEnded"],
    ]);

    // Family, doctors and the emergency QR see nothing
    expect(
      (await ana.get(`/api/records?ownerId=${USERS.maria.id}`)).status,
    ).toBe(404);
    expect((await ana.get("/api/search?q=cbc")).body.results).toEqual([]);
    expect((await t.api().get(`/api/shared/${link.token}`)).status).toBe(404);
    expect((await t.api().get(`/api/emergency/${token}`)).status).toBe(404);

    // Signing in brings it all back
    t.emails.clear();
    const back = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: PASSWORD });
    expect(back.body.welcomeBack).toBe(true);
    expect(t.emails.notices.map((n) => n.notice.kind)).toEqual(["reactivated"]);
    expect(
      (await ana.get(`/api/records?ownerId=${USERS.maria.id}`)).status,
    ).toBe(200);
    expect((await t.api().get(`/api/shared/${link.token}`)).status).toBe(200);
    expect((await t.api().get(`/api/emergency/${token}`)).status).toBe(200);
    // Only once
    const again = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: PASSWORD });
    expect(again.body.welcomeBack).toBe(false);
  });

  it("emails at 6 months and a week before, then deletes after a year", async () => {
    const { maria } = await share("view");
    // Ana also shares with Maria, so she's told when Maria leaves
    const ana = await t.as("ana");
    await ana.post("/api/family/invitations").send({
      email: USERS.maria.email,
      relationship: "Nanay",
      access: "view",
    });
    await maria
      .post("/api/family/invitations/accept")
      .send({ token: t.emails.invitations.at(-1)!.invitation.token });
    await fill(maria);
    expect(storedFiles()).toBeGreaterThan(0);
    await maria
      .post("/api/account/delete")
      .send({ mode: "suspend", password: PASSWORD });
    t.emails.clear();

    const kinds = () => t.emails.notices.map((n) => n.notice.kind);
    t.clock.advance(100 * DAY);
    expect(await t.app.runAccountDeletions()).toBe(0);
    expect(kinds()).toEqual([]);
    t.clock.advance(83 * DAY);
    await t.app.runAccountDeletions();
    await t.app.runAccountDeletions();
    expect(kinds()).toEqual(["stillSuspended"]);
    t.clock.advance(176 * DAY);
    await t.app.runAccountDeletions();
    expect(kinds()).toEqual(["stillSuspended", "deletingSoon"]);
    t.clock.advance(7 * DAY);
    expect(await t.app.runAccountDeletions()).toBe(1);
    expect(t.emails.notices.map((n) => [n.to.email, n.notice.kind])).toEqual([
      [USERS.maria.email, "stillSuspended"],
      [USERS.maria.email, "deletingSoon"],
      [USERS.maria.email, "deleted"],
      [USERS.ana.email, "memberLeft"],
    ]);

    // Gone: can't sign in, and the files are removed from storage
    const login = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: PASSWORD });
    expect(login.status).toBe(401);
    expect(storedFiles()).toBe(0);
    // Ana's own account is fine
    expect((await t.as("ana")).get("/api/auth/me")).toBeTruthy();
  });

  it("can delete everything right away, after typing DELETE", async () => {
    const { maria } = await share("view");
    await fill(maria);
    const unsure = await maria
      .post("/api/account/delete")
      .send({ mode: "now", password: PASSWORD, confirm: "delete" });
    expect(unsure.status).toBe(400);
    const done = await maria
      .post("/api/account/delete")
      .send({ mode: "now", password: PASSWORD, confirm: "DELETE" });
    expect(done.body).toEqual({ deleted: true });
    expect(storedFiles()).toBe(0);
    expect(t.emails.notices.map((n) => [n.to.email, n.notice.kind])).toEqual([
      [USERS.maria.email, "deleted"],
      [USERS.ana.email, "sharingEnded"],
    ]);
    const rows = await t.pool.query(
      "select (select count(*) from users where id = $1)::int as users, (select count(*) from records where owner_id = $1)::int as records",
      [USERS.maria.id],
    );
    expect(rows.rows[0]).toEqual({ users: 0, records: 0 });
  });
});
