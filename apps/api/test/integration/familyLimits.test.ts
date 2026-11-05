import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp({ invitationEmailLimit: 2 });

describe("invitation limits", () => {
  it("sends at most a few invitations to one email a day", async () => {
    let maria = await t.as("maria");
    const send = () =>
      maria.post("/api/family/invitations").send({
        email: "lolo@example.com",
        relationship: "Lolo",
        access: "view",
      });
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(429);

    // Other people can still be invited
    expect(
      (
        await maria.post("/api/family/invitations").send({
          email: USERS.ana.email,
          relationship: "Anak",
          access: "view",
        })
      ).status,
    ).toBe(201);

    t.clock.advance(24 * 60 * 60 * 1000);
    maria = await t.as("maria");
    expect((await send()).status).toBe(201);
  });

  it("keeps at most 20 people, counting waiting invitations", async () => {
    const maria = await t.as("maria");
    for (let i = 0; i < 20; i++) {
      const response = await maria.post("/api/family/invitations").send({
        email: `person${i}@example.com`,
        relationship: "Pinsan",
        access: "view",
      });
      expect(response.status).toBe(201);
    }
    const one = await maria.post("/api/family/invitations").send({
      email: "one-more@example.com",
      relationship: "Pinsan",
      access: "view",
    });
    expect(one.status).toBe(400);
    expect(one.body.message).toContain("up to 20");
    // Re-sending to someone already waiting still works
    const again = await maria.post("/api/family/invitations").send({
      email: "person0@example.com",
      relationship: "Pinsan",
      access: "view",
    });
    expect(again.status).toBe(201);
  });
});
