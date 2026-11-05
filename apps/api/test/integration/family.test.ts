import { describe, expect, it } from "vitest";
import { NEW_USER, PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;

const invite = {
  email: USERS.ana.email,
  relationship: "Anak",
  access: "view",
} as const;

// Maria invites someone; returns the token from the email's link
async function mariaInvites(
  maria: Browser,
  body: { email: string; relationship: string; access: string } = invite,
) {
  const response = await maria.post("/api/family/invitations").send(body);
  expect(response.status).toBe(201);
  return t.emails.invitations.at(-1)!.invitation.token;
}

describe("inviting family", () => {
  it("emails an invitation and lists it as waiting", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .post("/api/family/invitations")
      .send({ ...invite, email: " ANA@example.com " });
    expect(response.status).toBe(201);
    expect(response.body.invitation).toMatchObject({
      email: "ana@example.com",
      relationship: "Anak",
      access: "view",
      status: "pending",
    });
    expect(response.body.invitation).not.toHaveProperty("tokenHash");

    expect(t.emails.invitations).toHaveLength(1);
    const sent = t.emails.invitations[0];
    expect(sent.to).toBe("ana@example.com");
    expect(sent.invitation).toMatchObject({
      inviterName: "Maria Lopez Santos",
      relationship: "Anak",
      access: "view",
    });
    expect(sent.invitation.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // 7 days
    expect(sent.invitation.expiresAt.getTime() - t.clock.now().getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );

    const family = await maria.get("/api/family");
    expect(family.body.invitations).toHaveLength(1);
    expect(family.body.members).toEqual([]);

    // Only a hash of the token is stored
    const row = await t.pool.query("select token_hash from family_invitations");
    expect(row.rows[0].token_hash).not.toContain(sent.invitation.token);
  });

  it("invites emails that have no account yet", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .post("/api/family/invitations")
      .send({ ...invite, email: "lolo@example.com" });
    expect(response.status).toBe(201);
  });

  it("sends a fresh link when the same email is invited again", async () => {
    const maria = await t.as("maria");
    const first = await mariaInvites(maria);
    const second = await mariaInvites(maria, { ...invite, access: "manage" });
    expect(second).not.toBe(first);

    const family = await maria.get("/api/family");
    expect(family.body.invitations).toHaveLength(1);
    expect(family.body.invitations[0].access).toBe("manage");
    // The old link stopped working
    const old = await t
      .api()
      .post("/api/family/invitations/lookup")
      .send({ token: first });
    expect(old.status).toBe(404);
  });

  it("refuses your own email, bad fields, and someone who already has access", async () => {
    const maria = await t.as("maria");
    const self = await maria
      .post("/api/family/invitations")
      .send({ ...invite, email: USERS.maria.email });
    expect(self.status).toBe(400);
    expect(self.body.errors.email[0]).toContain("your own email");

    const bad = await maria
      .post("/api/family/invitations")
      .send({ email: "nope", relationship: "Boss", access: "admin" });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors).sort()).toEqual([
      "access",
      "email",
      "relationship",
    ]);

    const token = await mariaInvites(maria);
    const ana = await t.as("ana");
    await ana.post("/api/family/invitations/accept").send({ token });
    const again = await maria.post("/api/family/invitations").send(invite);
    expect(again.status).toBe(400);
    expect(again.body.errors.email[0]).toContain("can already see");
  });

  it("needs a sign-in", async () => {
    expect((await t.api().get("/api/family")).status).toBe(401);
    expect(
      (await t.api().post("/api/family/invitations").send(invite)).status,
    ).toBe(401);
  });

  it("can be cancelled, and the link stops working", async () => {
    const maria = await t.as("maria");
    const token = await mariaInvites(maria);
    const id = (await maria.get("/api/family")).body.invitations[0].id;

    const ana = await t.as("ana");
    expect((await ana.delete(`/api/family/invitations/${id}`)).status).toBe(
      404,
    );
    expect((await maria.delete(`/api/family/invitations/${id}`)).status).toBe(
      204,
    );
    expect((await maria.get("/api/family")).body.invitations).toEqual([]);

    const preview = await t
      .api()
      .post("/api/family/invitations/lookup")
      .send({ token });
    expect(preview.body.status).toBe("cancelled");
    const accept = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(accept.status).toBe(400);
    expect(accept.body.message).toContain("cancelled");
  });

  it("can be sent again with a new link", async () => {
    let maria = await t.as("maria");
    const first = await mariaInvites(maria);
    const id = (await maria.get("/api/family")).body.invitations[0].id;
    t.clock.advance(8 * 24 * 60 * 60 * 1000);
    // (8 days away also locked Maria's session)
    maria = await t.as("maria");
    expect((await maria.get("/api/family")).body.invitations[0].status).toBe(
      "expired",
    );

    expect(
      (await maria.post(`/api/family/invitations/${id}/resend`)).status,
    ).toBe(204);
    const second = t.emails.invitations.at(-1)!.invitation.token;
    expect(second).not.toBe(first);
    expect((await maria.get("/api/family")).body.invitations[0].status).toBe(
      "pending",
    );

    const ana = await t.as("ana");
    expect(
      (await ana.post("/api/family/invitations/accept").send({ token: first }))
        .status,
    ).toBe(404);
    expect(
      (await ana.post("/api/family/invitations/accept").send({ token: second }))
        .status,
    ).toBe(204);
  });
});

describe("the invitation link", () => {
  it("shows who invited you without signing in, hiding most of the email", async () => {
    const token = await mariaInvites(await t.as("maria"));
    const response = await t
      .api()
      .post("/api/family/invitations/lookup")
      .send({ token });
    expect(response.body).toMatchObject({
      inviterName: "Maria Lopez Santos",
      email: "a•••a@example.com",
      relationship: "Anak",
      access: "view",
      status: "pending",
      forThisAccount: null,
    });

    const ana = await t.as("ana");
    const asAna = await ana
      .post("/api/family/invitations/lookup")
      .send({ token });
    expect(asAna.body.forThisAccount).toBe(true);
  });

  it("doesn't work with a made-up token", async () => {
    const response = await t
      .api()
      .post("/api/family/invitations/lookup")
      .send({ token: "a".repeat(43) });
    expect(response.status).toBe(404);
    const short = await t
      .api()
      .post("/api/family/invitations/lookup")
      .send({ token: "abc" });
    expect(short.status).toBe(400);
  });

  it("is accepted by the invited email's account, which can then see the records", async () => {
    const maria = await t.as("maria");
    const token = await mariaInvites(maria, { ...invite, access: "manage" });
    const ana = await t.as("ana");
    const accept = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(accept.status).toBe(204);

    const mine = await maria.get("/api/family");
    expect(mine.body.invitations).toEqual([]);
    expect(mine.body.members).toEqual([
      expect.objectContaining({
        userId: USERS.ana.id,
        firstName: "Ana",
        email: USERS.ana.email,
        relationship: "Anak",
        access: "manage",
      }),
    ]);

    const hers = await ana.get("/api/family");
    expect(hers.body.sharedWithMe).toEqual([
      expect.objectContaining({
        ownerId: USERS.maria.id,
        firstName: "Maria",
        relationship: "Anak",
        access: "manage",
      }),
    ]);
    // One way: Maria doesn't see Ana's
    expect(mine.body.sharedWithMe).toEqual([]);
    expect(hers.body.members).toEqual([]);

    // Used up
    const twice = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(twice.body.message).toContain("already accepted");
  });

  it("can't be accepted by an account with a different email", async () => {
    const token = await mariaInvites(await t.as("maria"), {
      ...invite,
      email: "lolo@example.com",
    });
    const ana = await t.as("ana");
    const response = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("l•••o@example.com");
    const preview = await ana
      .post("/api/family/invitations/lookup")
      .send({ token });
    expect(preview.body.forThisAccount).toBe(false);
  });

  it("needs a sign-in to accept, then works for a brand-new account", async () => {
    const token = await mariaInvites(await t.as("maria"), {
      ...invite,
      email: NEW_USER.email,
    });
    expect(
      (await t.api().post("/api/family/invitations/accept").send({ token }))
        .status,
    ).toBe(401);

    const ben = t.api();
    await ben.post("/api/auth/register").send(NEW_USER);
    expect(
      (await ben.post("/api/family/invitations/accept").send({ token })).status,
    ).toBe(204);
  });

  it("can be declined without an account", async () => {
    const maria = await t.as("maria");
    const token = await mariaInvites(maria);
    expect(
      (await t.api().post("/api/family/invitations/decline").send({ token }))
        .status,
    ).toBe(204);
    const family = await maria.get("/api/family");
    expect(family.body.invitations[0].status).toBe("declined");
    expect(family.body.members).toEqual([]);

    const ana = await t.as("ana");
    const accept = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(accept.body.message).toContain("declined");
  });

  it("stops working after 7 days", async () => {
    const token = await mariaInvites(await t.as("maria"));
    t.clock.advance(7 * 24 * 60 * 60 * 1000);
    const ana = await t.as("ana");
    const response = await ana
      .post("/api/family/invitations/accept")
      .send({ token });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("expired");
  });
});

describe("people who can see my records", () => {
  async function shareWithAna() {
    const maria = await t.as("maria");
    const token = await mariaInvites(maria);
    const ana = await t.as("ana");
    await ana.post("/api/family/invitations/accept").send({ token });
    return { maria, ana };
  }

  it("changes what someone can do", async () => {
    const { maria, ana } = await shareWithAna();
    expect(
      (
        await maria
          .put(`/api/family/members/${USERS.ana.id}`)
          .send({ access: "manage" })
      ).status,
    ).toBe(204);
    expect((await ana.get("/api/family")).body.sharedWithMe[0].access).toBe(
      "manage",
    );
    // Ana can't change her own access to Maria's records
    expect(
      (
        await ana
          .put(`/api/family/members/${USERS.maria.id}`)
          .send({ access: "manage" })
      ).status,
    ).toBe(404);
  });

  it("lets the owner remove someone, and the member leave", async () => {
    const { maria, ana } = await shareWithAna();
    expect(
      (await maria.delete(`/api/family/members/${USERS.ana.id}`)).status,
    ).toBe(204);
    expect((await ana.get("/api/family")).body.sharedWithMe).toEqual([]);
    expect(
      (await maria.delete(`/api/family/members/${USERS.ana.id}`)).status,
    ).toBe(404);

    const again = await shareWithAna();
    expect(
      (await again.ana.delete(`/api/family/shared/${USERS.maria.id}`)).status,
    ).toBe(204);
    expect((await again.maria.get("/api/family")).body.members).toEqual([]);
  });
});

describe("profiles for family without email", () => {
  const juanito = {
    firstName: "Juanito",
    middleName: "",
    lastName: "Santos",
    relationship: "Anak",
    birthDate: "2021-03-14",
  };

  it("adds, changes and removes a profile", async () => {
    const maria = await t.as("maria");
    const added = await maria.post("/api/family/profiles").send(juanito);
    expect(added.status).toBe(201);
    expect(added.body.profile).toMatchObject({
      firstName: "Juanito",
      middleName: null,
      relationship: "Anak",
      birthDate: "2021-03-14",
    });
    const id = added.body.profile.id;

    const changed = await maria
      .put(`/api/family/profiles/${id}`)
      .send({ ...juanito, firstName: "Juan Jr.", birthDate: "" });
    expect(changed.body.profile).toMatchObject({
      firstName: "Juan Jr.",
      birthDate: null,
    });
    expect((await maria.get("/api/family")).body.profiles).toHaveLength(1);

    expect((await maria.delete(`/api/family/profiles/${id}`)).status).toBe(204);
    expect((await maria.get("/api/family")).body.profiles).toEqual([]);
  });

  it("refuses a birth date in the future or that doesn't exist", async () => {
    const maria = await t.as("maria");
    for (const birthDate of ["2999-01-01", "2023-02-30", "14/03/2021"]) {
      const response = await maria
        .post("/api/family/profiles")
        .send({ ...juanito, birthDate });
      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty("birthDate");
    }
  });

  it("only the owner can change or remove a profile", async () => {
    const maria = await t.as("maria");
    const id = (await maria.post("/api/family/profiles").send(juanito)).body
      .profile.id;
    const ana = await t.as("ana");
    expect(
      (await ana.put(`/api/family/profiles/${id}`).send(juanito)).status,
    ).toBe(404);
    expect((await ana.delete(`/api/family/profiles/${id}`)).status).toBe(404);
  });

  it("are shown to the people the owner shares with", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/family/profiles").send(juanito);
    const token = await mariaInvites(maria, {
      ...invite,
      relationship: "Asawa",
    });
    const ana = await t.as("ana");
    expect((await ana.get("/api/family")).body.sharedWithMe).toEqual([]);
    await ana.post("/api/family/invitations/accept").send({ token });
    const shared = (await ana.get("/api/family")).body.sharedWithMe[0];
    expect(shared.profiles).toEqual([
      expect.objectContaining({ firstName: "Juanito" }),
    ]);
  });
});

describe("account changes", () => {
  it("deleting nothing else: sharing survives a password change", async () => {
    const maria = await t.as("maria");
    const token = await mariaInvites(maria);
    const ana = await t.as("ana");
    await ana.post("/api/family/invitations/accept").send({ token });
    await maria
      .put("/api/account/password")
      .send({ currentPassword: PASSWORD, newPassword: "another-password" });
    expect((await maria.get("/api/family")).body.members).toHaveLength(1);
  });
});
