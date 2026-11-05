import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;
const DAY = 24 * 60 * 60 * 1000;

const cbc = {
  type: "lab",
  title: "CBC",
  recordDate: "2026-10-15",
  facility: "St. Luke's",
  doctor: "Dr. Cruz",
  details: {
    results: [
      {
        name: "Hemoglobin",
        value: "6.0",
        unit: "g/dL",
        rangeLow: 12,
        rangeHigh: 16,
      },
      {
        name: "WBC",
        value: "9.1",
        unit: "x10^9/L",
        rangeLow: 4.5,
        rangeHigh: 11,
      },
    ],
  },
};

async function add(
  browser: Browser,
  body: object = cbc,
  ownerId = USERS.maria.id,
) {
  const response = await browser
    .post("/api/records")
    .send({ ownerId, ...body });
  expect(response.status).toBe(201);
  return response.body.record as { id: string; [key: string]: unknown };
}

// Maria shares her records with Ana
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

async function history(browser: Browser, id: string) {
  const response = await browser.get(`/api/records/${id}/history`);
  expect(response.status).toBe(200);
  return response.body.entries as {
    action: string;
    actorName: string | null;
    changes: unknown[];
  }[];
}

describe("adding records", () => {
  it("adds a lab result and shows it in the list, newest first", async () => {
    const maria = await t.as("maria");
    const record = await add(maria);
    expect(record).toMatchObject({
      type: "lab",
      title: "CBC",
      personName: "Maria Lopez Santos",
      profileId: null,
      outOfRange: 1,
      createdByName: "Maria Lopez Santos",
      role: "owner",
    });
    await add(maria, {
      type: "prescription",
      title: "Antibiotics",
      recordDate: "2026-11-01",
      details: {
        medicines: [
          { name: "Amoxicillin", dose: "500 mg", frequency: "3x a day" },
        ],
      },
    });

    const list = await maria.get("/api/records");
    expect(list.body.role).toBe("owner");
    expect(list.body.records.map((r: { title: string }) => r.title)).toEqual([
      "Antibiotics",
      "CBC",
    ]);
    const labs = await maria.get("/api/records?type=lab");
    expect(labs.body.records).toHaveLength(1);
  });

  it("keeps every type's own fields", async () => {
    const maria = await t.as("maria");
    const soa = await add(maria, {
      type: "billing",
      title: "SOA, Makati Med",
      recordDate: "2026-09-02",
      details: {
        hmo: "Maxicare",
        loaNumber: "LOA-123",
        totalAmount: 45210.5,
        hmoCovered: 40000,
        youPaid: 5210.5,
      },
    });
    const got = await maria.get(`/api/records/${soa.id}`);
    expect(got.body.record.details).toEqual({
      hmo: "Maxicare",
      loaNumber: "LOA-123",
      totalAmount: 45210.5,
      hmoCovered: 40000,
      youPaid: 5210.5,
    });
  });

  it("says which lab row has a problem", async () => {
    const maria = await t.as("maria");
    const response = await maria.post("/api/records").send({
      ownerId: USERS.maria.id,
      ...cbc,
      title: "",
      details: {
        results: [
          { name: "Hemoglobin", value: "", rangeLow: 16, rangeHigh: 12 },
        ],
      },
    });
    expect(response.status).toBe(400);
    expect(Object.keys(response.body.errors).sort()).toEqual([
      "details.results.0.rangeHigh",
      "details.results.0.value",
      "title",
    ]);
  });

  it("adds records for your own profiles only", async () => {
    const maria = await t.as("maria");
    const juanito = (
      await maria.post("/api/family/profiles").send({
        firstName: "Juanito",
        lastName: "Santos",
        relationship: "Anak",
      })
    ).body.profile.id;
    const record = await add(maria, { ...cbc, profileId: juanito });
    expect(record.personName).toBe("Juanito Santos");
    const forJuanito = await maria.get(`/api/records?profileId=${juanito}`);
    expect(forJuanito.body.records).toHaveLength(1);
    expect(
      (await maria.get("/api/records?profileId=self")).body.records,
    ).toEqual([]);

    const ana = await t.as("ana");
    const notHers = await ana
      .post("/api/records")
      .send({ ownerId: USERS.ana.id, ...cbc, profileId: juanito });
    expect(notHers.status).toBe(404);
  });

  it("keeps a profile with records from being removed", async () => {
    const maria = await t.as("maria");
    const juanito = (
      await maria.post("/api/family/profiles").send({
        firstName: "Juanito",
        lastName: "Santos",
        relationship: "Anak",
      })
    ).body.profile.id;
    await add(maria, { ...cbc, profileId: juanito });
    const response = await maria.delete(`/api/family/profiles/${juanito}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Juanito still has 1 record");
  });
});

describe("who can do what", () => {
  it("hides records from people they aren't shared with", async () => {
    const maria = await t.as("maria");
    const record = await add(maria);
    const ana = await t.as("ana");
    expect((await ana.get(`/api/records/${record.id}`)).status).toBe(404);
    expect(
      (await ana.get(`/api/records?ownerId=${USERS.maria.id}`)).status,
    ).toBe(404);
    expect(
      (await ana.post("/api/records").send({ ownerId: USERS.maria.id, ...cbc }))
        .status,
    ).toBe(404);
    expect((await t.api().get("/api/records")).status).toBe(401);
  });

  it("lets “Can view” family look, but not change anything", async () => {
    const { maria, ana } = await share("view");
    const record = await add(maria);
    const got = await ana.get(`/api/records/${record.id}`);
    expect(got.body.record.role).toBe("view");
    expect(
      (await ana.get(`/api/records?ownerId=${USERS.maria.id}`)).body.records,
    ).toHaveLength(1);
    expect((await history(ana, record.id)).length).toBe(1);

    const tries = [
      await ana.post("/api/records").send({ ownerId: USERS.maria.id, ...cbc }),
      await ana.put(`/api/records/${record.id}`).send(cbc),
      await ana.delete(`/api/records/${record.id}`),
    ];
    for (const response of tries) {
      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Can manage");
    }
  });

  it("lets “Can manage” family add, edit and move to the Trash, and records who did it", async () => {
    const { maria, ana } = await share("manage");
    const added = await add(ana);
    expect(added.createdByName).toBe("Ana Reyes");
    expect(added.role).toBe("manage");

    const edited = await ana.put(`/api/records/${added.id}`).send({
      ...cbc,
      details: {
        results: [
          { ...cbc.details.results[0], value: "8.0" },
          cbc.details.results[1],
        ],
      },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.record.updatedByName).toBe("Ana Reyes");

    expect((await ana.delete(`/api/records/${added.id}`)).status).toBe(204);

    const entries = await history(maria, added.id);
    expect(entries.map((e) => [e.action, e.actorName])).toEqual([
      ["record.trashed", "Ana Reyes"],
      ["record.edited", "Ana Reyes"],
      ["record.created", "Ana Reyes"],
    ]);
    expect(entries[1].changes).toEqual([
      { field: "Hemoglobin result", from: "6.0 g/dL", to: "8.0 g/dL" },
    ]);
  });

  it("lets only the owner open the Trash, restore and delete for good", async () => {
    const { maria, ana } = await share("manage");
    const record = await add(maria);
    await ana.delete(`/api/records/${record.id}`);

    expect(
      (await ana.get(`/api/records/trash?ownerId=${USERS.maria.id}`)).status,
    ).toBe(403);
    expect((await ana.post(`/api/records/${record.id}/restore`)).status).toBe(
      403,
    );
    expect((await ana.delete(`/api/records/${record.id}/forever`)).status).toBe(
      403,
    );
    // Ana's own Trash is empty; emptying it doesn't touch Maria's
    expect((await ana.delete("/api/records/trash")).body.deleted).toBe(0);

    const trash = await maria.get("/api/records/trash");
    expect(trash.body.records).toEqual([
      expect.objectContaining({
        id: record.id,
        title: "CBC",
        deletedByName: "Ana Reyes",
      }),
    ]);
  });
});

describe("the Trash", () => {
  it("hides trashed records until they're restored", async () => {
    const maria = await t.as("maria");
    const record = await add(maria);
    await maria.delete(`/api/records/${record.id}`);
    expect((await maria.get("/api/records")).body.records).toEqual([]);
    expect((await maria.get(`/api/records/${record.id}`)).status).toBe(404);

    const trash = (await maria.get("/api/records/trash")).body.records[0];
    expect(
      new Date(trash.purgeAt).getTime() - new Date(trash.deletedAt).getTime(),
    ).toBe(30 * DAY);

    expect((await maria.post(`/api/records/${record.id}/restore`)).status).toBe(
      204,
    );
    expect((await maria.get("/api/records")).body.records).toHaveLength(1);
    expect((await history(maria, record.id)).map((e) => e.action)).toEqual([
      "record.restored",
      "record.trashed",
      "record.created",
    ]);
  });

  it("deletes for good only from the Trash, and keeps the history", async () => {
    const maria = await t.as("maria");
    const record = await add(maria);
    expect(
      (await maria.delete(`/api/records/${record.id}/forever`)).status,
    ).toBe(404);
    await maria.delete(`/api/records/${record.id}`);
    expect(
      (await maria.delete(`/api/records/${record.id}/forever`)).status,
    ).toBe(204);
    expect((await maria.get("/api/records/trash")).body.records).toEqual([]);

    const activity = await maria.get("/api/activity");
    expect(
      activity.body.entries.map((e: { action: string; subject: string }) => [
        e.action,
        e.subject,
      ]),
    ).toEqual([
      ["record.deleted", "CBC"],
      ["record.trashed", "CBC"],
      ["record.created", "CBC"],
    ]);
  });

  it("empties the whole Trash", async () => {
    const maria = await t.as("maria");
    for (const title of ["One", "Two"]) {
      const record = await add(maria, { ...cbc, title });
      await maria.delete(`/api/records/${record.id}`);
    }
    expect((await maria.delete("/api/records/trash")).body.deleted).toBe(2);
    expect((await maria.get("/api/records/trash")).body.records).toEqual([]);
  });

  it("deletes records for good after 30 days, by Talaan itself", async () => {
    let maria = await t.as("maria");
    const old = await add(maria, { ...cbc, title: "Old" });
    await maria.delete(`/api/records/${old.id}`);
    t.clock.advance(20 * DAY);
    maria = await t.as("maria");
    const newer = await add(maria, { ...cbc, title: "Newer" });
    await maria.delete(`/api/records/${newer.id}`);

    t.clock.advance(10 * DAY);
    expect(await t.app.purgeExpiredTrash()).toBe(1);
    maria = await t.as("maria");
    const trash = await maria.get("/api/records/trash");
    expect(trash.body.records.map((r: { title: string }) => r.title)).toEqual([
      "Newer",
    ]);

    const purged = (await maria.get("/api/activity")).body.entries[0];
    expect(purged).toMatchObject({
      action: "record.purged",
      actorName: null,
      subject: "Old",
    });
  });
});

describe("the history", () => {
  it("records nothing when an edit changes nothing", async () => {
    const maria = await t.as("maria");
    const record = await add(maria);
    await maria.put(`/api/records/${record.id}`).send(cbc);
    expect((await history(maria, record.id)).length).toBe(1);
  });

  it("can't be changed, even directly in the database", async () => {
    const maria = await t.as("maria");
    await add(maria);
    await expect(
      t.pool.query("update audit_log set actor_name = 'Someone else'"),
    ).rejects.toThrow(/cannot be changed/);
  });

  it("also records sharing: invitations, accepting and access changes", async () => {
    const { maria } = await share("view");
    await maria
      .put(`/api/family/members/${USERS.ana.id}`)
      .send({ access: "manage" });
    const entries = (await maria.get("/api/activity")).body.entries;
    expect(
      entries.map((e: { action: string; actorName: string | null }) => [
        e.action,
        e.actorName,
      ]),
    ).toEqual([
      ["family.access_changed", "Maria Lopez Santos"],
      ["family.accepted", "Ana Reyes"],
      ["family.invited", "Maria Lopez Santos"],
    ]);
    expect(entries[0].changes).toEqual([
      { field: "Access", from: "Can view", to: "Can manage" },
    ]);
    // Ana's own activity is hers alone
    const ana = await t.as("ana");
    expect((await ana.get("/api/activity")).body.entries).toEqual([]);
  });

  it("pages through older entries", async () => {
    const maria = await t.as("maria");
    for (let i = 0; i < 51; i++) {
      t.clock.advance(1000);
      await add(maria, { ...cbc, title: `Record ${i}` });
    }
    const first = await maria.get("/api/activity");
    expect(first.body.entries).toHaveLength(50);
    expect(first.body.next).not.toBeNull();
    const second = await maria.get(`/api/activity?before=${first.body.next}`);
    expect(
      second.body.entries.map((e: { subject: string }) => e.subject),
    ).toEqual(["Record 0"]);
  });
});

describe("accounts you can open", () => {
  it("lists your own and the ones shared with you, with their people", async () => {
    const { maria, ana } = await share("view");
    await maria.post("/api/family/profiles").send({
      firstName: "Juanito",
      lastName: "Santos",
      relationship: "Anak",
    });
    const accounts = (await ana.get("/api/records/accounts")).body.accounts;
    expect(accounts).toEqual([
      expect.objectContaining({ ownerId: USERS.ana.id, role: "owner" }),
      expect.objectContaining({
        ownerId: USERS.maria.id,
        ownerName: "Maria Lopez Santos",
        role: "view",
        people: [
          { profileId: null, name: "Maria Lopez Santos", relationship: null },
          expect.objectContaining({
            name: "Juanito Santos",
            relationship: "Anak",
          }),
        ],
      }),
    ]);
  });
});
