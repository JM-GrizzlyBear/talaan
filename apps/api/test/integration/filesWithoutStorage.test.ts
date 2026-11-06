import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

// The live site before CLOUDINARY_URL is set
const t = useTestApp({ withoutStorage: true });

describe("uploads without storage", () => {
  it("say uploading isn't set up, and records still work", async () => {
    const maria = await t.as("maria");
    const created = await maria.post("/api/records").send({
      ownerId: USERS.maria.id,
      type: "other",
      title: "Note",
      recordDate: "2026-10-15",
    });
    expect(created.status).toBe(201);
    const target = await maria.post(
      `/api/records/${created.body.record.id}/files/upload-target`,
    );
    expect(target.status).toBe(503);
    expect(target.body.message).toContain("isn't set up");
    expect((await maria.put("/api/uploads/local").send("x")).status).toBe(404);
  });
});
