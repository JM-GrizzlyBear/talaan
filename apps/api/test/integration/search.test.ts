import { formatLabelCode } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;
type Found = {
  kind: string;
  title: string;
  personName: string;
  path: string;
  match: { label: string; text: string } | null;
  subtitle: string;
};

async function search(browser: Browser, q: string) {
  const response = await browser.get("/api/search").query({ q });
  expect(response.status).toBe(200);
  return response.body.results as Found[];
}

const titles = (found: Found[]) => found.map((f) => `${f.kind}:${f.title}`);

async function fill(maria: Browser) {
  const add = async (fields: object) =>
    (
      await maria
        .post("/api/records")
        .send({ ownerId: USERS.maria.id, ...fields })
    ).body.record.id as string;
  const box = (
    await maria
      .post("/api/places")
      .send({ ownerId: USERS.maria.id, kind: "box", name: "Blue box" })
  ).body.place;
  await add({
    type: "lab",
    title: "CBC",
    recordDate: "2026-03-02",
    facility: "St. Luke's",
    details: {
      results: [{ name: "Hgb", value: "11.2", unit: "g/dL" }],
    },
  });
  await add({
    type: "lab",
    title: "CBC",
    recordDate: "2026-10-05",
    facility: "St. Luke's",
    placeId: box.id,
    details: {
      results: [{ name: "Hemoglobin", value: "12.8", unit: "g/dL" }],
    },
  });
  const bill = await add({
    type: "billing",
    title: "Resibo ng ospital",
    recordDate: "2026-09-12",
    details: { hmo: "Maxicare", loaNumber: "LOA-55821" },
  });
  await add({
    type: "imaging",
    title: "Chest X-ray",
    recordDate: "2026-09-12",
    notes: "Follow up in 6 months. No active lung disease seen.",
    details: { bodyPart: "Chest", reading: "Clear lungs." },
  });
  await maria.post("/api/reminders").send({
    ownerId: USERS.maria.id,
    kind: "medicine",
    title: "Losartan",
    dose: "50 mg once a day",
    schedule: {
      start: "2026-11-10",
      times: ["08:00"],
      repeat: { every: "day", interval: 1 },
      end: { type: "never" },
    },
    alerts: [0],
  });
  await maria.put("/api/medical-id").send({
    fields: {
      bloodType: "O+",
      allergies: [
        { name: "Penicillin", reaction: "Hives", severity: "severe" },
      ],
    },
  });
  return { box, bill };
}

describe("search", () => {
  it("finds records, lab tests, places, reminders and the Medical ID", async () => {
    const maria = await t.as("maria");
    const { box } = await fill(maria);

    const cbc = await search(maria, "cbc");
    expect(titles(cbc).slice(0, 2)).toEqual(["record:CBC", "record:CBC"]);
    // Newest first among equal ones
    expect(cbc[0].subtitle).toContain("Oct 5, 2026");

    // A test, however it was written ("Hgb" and "Hemoglobin" are one)
    const hemo = await search(maria, "hemoglobin");
    const test = hemo.find((f) => f.kind === "test")!;
    expect(test).toMatchObject({
      title: "Hemoglobin",
      personName: "Maria Lopez Santos",
    });
    expect(test.subtitle).toContain("Latest 12.8");
    expect(test.path).toContain("view=test");
    expect(
      hemo.filter((f) => f.kind === "record").map((f) => f.match),
    ).toContainEqual({ label: "Result", text: "Hemoglobin 12.8 g/dL" });

    // In the notes: shows the part that matched
    const lung = await search(maria, "follow up");
    expect(lung[0]).toMatchObject({
      title: "Chest X-ray",
      match: { label: "Notes" },
    });

    expect(titles(await search(maria, "penicillin"))).toEqual([
      "medical:Maria Lopez Santos's Medical ID",
    ]);
    expect(titles(await search(maria, "losartan"))).toEqual([
      "reminder:Losartan",
    ]);
    expect(titles(await search(maria, "maxicare"))).toEqual([
      "record:Resibo ng ospital",
    ]);

    // A QR label's code, however it's typed
    const byCode = await search(maria, formatLabelCode(box.code).toLowerCase());
    expect(byCode[0]).toMatchObject({ kind: "place", title: "Blue box" });
    // Where a record is kept
    expect(
      (await search(maria, "blue box")).some(
        (f) => f.kind === "record" && f.match?.label === "Kept in",
      ),
    ).toBe(true);
  });

  it("understands Filipino words", async () => {
    const maria = await t.as("maria");
    await fill(maria);
    expect(titles(await search(maria, "dugo"))).toEqual(
      expect.arrayContaining(["record:CBC", "test:Hemoglobin"]),
    );
    expect(titles(await search(maria, "gamot"))).toContain("reminder:Losartan");
    expect(titles(await search(maria, "receipt"))).toContain(
      "record:Resibo ng ospital",
    );
    expect(titles(await search(maria, "baga"))).toContain("record:Chest X-ray");
    expect(titles(await search(maria, "xray 2026"))).toEqual([
      "record:Chest X-ray",
    ]);
  });

  it("searches family accounts shared with you, and nothing else", async () => {
    const maria = await t.as("maria");
    await fill(maria);
    const ana = await t.as("ana");
    expect(await search(ana, "cbc")).toEqual([]);

    await maria
      .post("/api/family/invitations")
      .send({ email: USERS.ana.email, relationship: "Anak", access: "view" });
    await ana
      .post("/api/family/invitations/accept")
      .send({ token: t.emails.invitations.at(-1)!.invitation.token });
    const shared = await search(ana, "cbc");
    expect(shared.map((f) => f.personName)).toContain("Maria Lopez Santos");

    // People: the owner and family profiles
    await maria
      .post("/api/family/profiles")
      .send({ firstName: "Lia", lastName: "Santos", relationship: "Anak" });
    const people = await search(maria, "anak");
    expect(titles(people)).toContain("person:Lia Santos");
  });

  it("leaves out the Trash, and short or missing words", async () => {
    const maria = await t.as("maria");
    const { bill } = await fill(maria);
    await maria.delete(`/api/records/${bill}`);
    expect(await search(maria, "maxicare")).toEqual([]);
    expect(await search(maria, "c")).toEqual([]);
    expect(await search(maria, "cbc makati")).toEqual([]);
    expect((await t.api().get("/api/search?q=cbc")).status).toBe(401);
    expect(
      (await maria.get("/api/search").query({ q: "x".repeat(101) })).status,
    ).toBe(400);
  });
});
