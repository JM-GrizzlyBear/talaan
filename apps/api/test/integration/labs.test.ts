import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

const lab = (
  title: string,
  recordDate: string,
  results: object[],
  more = {},
) => ({
  ownerId: USERS.maria.id,
  type: "lab",
  title,
  recordDate,
  details: { results },
  ...more,
});

describe("lab results to compare", () => {
  it("gives one person's lab records, oldest first, without the Trash", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/records").send(
      lab("Chemistry", "2026-09-01", [
        {
          name: "FBS",
          value: "130",
          unit: "mg/dL",
          rangeLow: 70,
          rangeHigh: 110,
        },
      ]),
    );
    await maria.post("/api/records").send(
      lab("Chemistry", "2026-03-01", [
        {
          name: "FBS",
          value: "6.1",
          unit: "mmol/L",
          rangeLow: 3.9,
          rangeHigh: 6.1,
        },
      ]),
    );
    const trashed = (
      await maria
        .post("/api/records")
        .send(
          lab("Old", "2020-01-01", [
            { name: "FBS", value: "90", unit: "mg/dL" },
          ]),
        )
    ).body.record;
    await maria.delete(`/api/records/${trashed.id}`);
    // Not a lab record: left out
    await maria.post("/api/records").send({
      ownerId: USERS.maria.id,
      type: "other",
      title: "Note",
      recordDate: "2026-05-01",
    });

    const response = await maria.get("/api/labs");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      role: "owner",
      personName: "Maria Lopez Santos",
    });
    expect(
      response.body.records.map(
        (r: { date: string; results: { value: string }[] }) => [
          r.date,
          r.results[0].value,
        ],
      ),
    ).toEqual([
      ["2026-03-01", "6.1"],
      ["2026-09-01", "130"],
    ]);
  });

  it("shows only that person's results", async () => {
    const maria = await t.as("maria");
    const profile = (
      await maria
        .post("/api/family/profiles")
        .send({ firstName: "Lia", lastName: "Santos", relationship: "Anak" })
    ).body.profile;
    await maria.post("/api/records").send(
      lab(
        "CBC",
        "2026-10-01",
        [{ name: "Hemoglobin", value: "11", unit: "g/dL" }],
        {
          profileId: profile.id,
        },
      ),
    );
    expect((await maria.get("/api/labs")).body.records).toEqual([]);
    const hers = (await maria.get(`/api/labs?profileId=${profile.id}`)).body;
    expect(hers.personName).toBe("Lia Santos");
    expect(hers.records).toHaveLength(1);
  });

  it("is hidden from everyone it isn't shared with", async () => {
    const ana = await t.as("ana");
    expect((await ana.get(`/api/labs?ownerId=${USERS.maria.id}`)).status).toBe(
      404,
    );
  });
});
