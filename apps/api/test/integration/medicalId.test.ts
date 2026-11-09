import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

const filled = {
  bloodType: "O+",
  allergies: [
    { name: "Shrimp", reaction: "Hives", severity: "moderate" },
    {
      name: "Penicillin",
      reaction: "Can't breathe",
      severity: "life-threatening",
    },
  ],
  conditions: [{ name: "Hypertension", since: "2019" }],
  medicines: [{ name: "Losartan", dose: "50 mg once a day" }],
  contacts: [
    { name: "Ana Santos", relationship: "Anak", phone: "0917 123 4567" },
  ],
  doctor: {
    name: "Dr. Reyes",
    specialty: "Cardiology",
    clinic: "St. Luke's",
    phone: "",
  },
  philhealth: "123456789012",
  notes: "Hard to find a vein: use the left arm",
};

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

describe("Medical ID", () => {
  it("starts empty, then keeps what's saved", async () => {
    const maria = await t.as("maria");
    const empty = (await maria.get("/api/medical-id")).body.medicalId;
    expect(empty).toMatchObject({
      personName: "Maria Lopez Santos",
      role: "owner",
      updatedAt: null,
      fields: { allergies: [], bloodType: "" },
      emergency: { on: false, token: null },
    });

    const saved = await maria.put("/api/medical-id").send({ fields: filled });
    expect(saved.status).toBe(200);
    expect(saved.body.medicalId.fields).toMatchObject({
      bloodType: "O+",
      philhealth: "12-345678901-2",
      conditions: [{ name: "Hypertension", since: "2019" }],
    });
    expect(saved.body.medicalId.updatedByName).toBe("Maria Lopez Santos");
  });

  it("checks the form like the website does", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .put("/api/medical-id")
      .send({ fields: { contacts: [{ name: "Ana", phone: "call me" }] } });
    expect(response.status).toBe(400);
    expect(response.body.errors["contacts.0.phone"]).toBeDefined();
  });

  it("keeps one for each family profile", async () => {
    const maria = await t.as("maria");
    const lia = (
      await maria
        .post("/api/family/profiles")
        .send({ firstName: "Lia", lastName: "Santos", relationship: "Anak" })
    ).body.profile;
    await maria
      .put("/api/medical-id")
      .send({ profileId: lia.id, fields: { bloodType: "A+" } });
    expect(
      (await maria.get("/api/medical-id")).body.medicalId.fields.bloodType,
    ).toBe("");
    const hers = (await maria.get(`/api/medical-id?profileId=${lia.id}`)).body
      .medicalId;
    expect(hers).toMatchObject({
      personName: "Lia Santos",
      fields: { bloodType: "A+" },
    });
  });

  it("writes what changed to the audit trail, without the numbers", async () => {
    const maria = await t.as("maria");
    await maria.put("/api/medical-id").send({ fields: filled });
    await maria.put("/api/medical-id").send({
      fields: {
        ...filled,
        allergies: [
          ...filled.allergies,
          { name: "Aspirin", severity: "severe" },
        ],
        philhealth: "",
      },
    });
    const entry = (await maria.get("/api/activity")).body.entries.find(
      (e: { action: string }) => e.action === "medicalid.edited",
    );
    expect(entry.changes).toEqual(
      expect.arrayContaining([
        {
          field: "Allergies",
          from: "Shrimp, Penicillin",
          to: "Shrimp, Penicillin, Aspirin",
        },
        { field: "PhilHealth ID", from: "Set", to: null },
      ]),
    );
  });

  it("lets “Can manage” family change it and “Can view” family only read it", async () => {
    const { maria, ana } = await share("view");
    await maria.put("/api/medical-id").send({ fields: filled });
    const seen = (await ana.get(`/api/medical-id?ownerId=${USERS.maria.id}`))
      .body.medicalId;
    expect(seen.role).toBe("view");
    expect(seen.fields.bloodType).toBe("O+");
    expect(
      (
        await ana
          .put("/api/medical-id")
          .send({ ownerId: USERS.maria.id, fields: {} })
      ).status,
    ).toBe(403);
  });

  it("is hidden from everyone it isn't shared with", async () => {
    const ana = await t.as("ana");
    expect(
      (await ana.get(`/api/medical-id?ownerId=${USERS.maria.id}`)).status,
    ).toBe(404);
  });
});

describe("the emergency QR", () => {
  it("shows only the contacts, and the extras chosen, to anyone with the code", async () => {
    const maria = await t.as("maria");
    await maria.put("/api/medical-id").send({ fields: filled });
    const on = await maria
      .put("/api/medical-id/emergency")
      .send({ on: true, extras: [] });
    const token = on.body.medicalId.emergency.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const guest = t.api();
    const page = await guest.get(`/api/emergency/${token}`);
    expect(page.status).toBe(200);
    expect(page.headers["cache-control"]).toBe("no-store");
    expect(page.body.emergency).toEqual({
      name: "Maria S.",
      contacts: filled.contacts,
    });

    await maria
      .put("/api/medical-id/emergency")
      .send({ on: true, extras: ["bloodType", "allergies"] });
    const more = (await guest.get(`/api/emergency/${token}`)).body.emergency;
    expect(more.bloodType).toBe("O+");
    expect(more.allergies.map((a: { name: string }) => a.name)).toEqual([
      "Penicillin",
      "Shrimp",
    ]);
    expect(more.conditions).toBeUndefined();
    expect(JSON.stringify(more)).not.toContain("12-345678901-2");
  });

  it("stops working when turned off, or when a new code is made", async () => {
    const maria = await t.as("maria");
    const first = (
      await maria
        .put("/api/medical-id/emergency")
        .send({ on: true, extras: [] })
    ).body.medicalId.emergency.token;
    const renewed = (
      await maria
        .put("/api/medical-id/emergency")
        .send({ on: true, extras: [], newCode: true })
    ).body.medicalId.emergency.token;
    expect(renewed).not.toBe(first);
    const guest = t.api();
    expect((await guest.get(`/api/emergency/${first}`)).status).toBe(404);
    expect((await guest.get(`/api/emergency/${renewed}`)).status).toBe(200);

    await maria
      .put("/api/medical-id/emergency")
      .send({ on: false, extras: [] });
    expect((await guest.get(`/api/emergency/${renewed}`)).status).toBe(404);
    expect((await guest.get("/api/emergency/short")).status).toBe(404);
    // Turned on again: the same printed code works again
    const again = (
      await maria
        .put("/api/medical-id/emergency")
        .send({ on: true, extras: [] })
    ).body.medicalId.emergency.token;
    expect(again).toBe(renewed);
  });

  it("shows the code only to those who can change it", async () => {
    const { maria, ana } = await share("view");
    await maria.put("/api/medical-id/emergency").send({ on: true, extras: [] });
    const seen = (await ana.get(`/api/medical-id?ownerId=${USERS.maria.id}`))
      .body.medicalId;
    expect(seen.emergency).toEqual({ on: true, extras: [], token: null });
    expect(
      (
        await ana
          .put("/api/medical-id/emergency")
          .send({ ownerId: USERS.maria.id, on: false, extras: [] })
      ).status,
    ).toBe(403);
  });
});
