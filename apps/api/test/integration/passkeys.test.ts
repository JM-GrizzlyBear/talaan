import { describe, expect, it } from "vitest";
import { deviceAnswer } from "../fixtures/passkeys.js";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = ReturnType<typeof t.api>;

// Adds a passkey the way the Security page does: get a prompt, answer it
async function addPasskey(
  browser: Browser,
  credentialId: string,
  name = "Maria's iPhone",
) {
  const options = await browser.post("/api/account/passkeys/options");
  expect(options.status).toBe(200);
  return await browser.post("/api/account/passkeys").send({
    name,
    response: deviceAnswer(credentialId, options.body.challenge),
  });
}

async function signInWithPasskey(
  browser: Browser,
  credentialId: string,
  extra: { signature?: string; counter?: number } = {},
) {
  const options = await browser.post("/api/auth/passkey/options");
  expect(options.status).toBe(200);
  return await browser.post("/api/auth/passkey/verify").send({
    response: deviceAnswer(credentialId, options.body.challenge, extra),
  });
}

describe("adding passkeys", () => {
  it("adds a passkey and lists it without key material", async () => {
    const maria = await t.as("maria");
    const added = await addPasskey(maria, "cred-1");
    expect(added.status).toBe(201);
    expect(added.body.passkey).toMatchObject({
      name: "Maria's iPhone",
      synced: true,
      lastUsedAt: null,
    });
    expect(added.body.passkey).not.toHaveProperty("publicKey");

    const list = await maria.get("/api/account/passkeys");
    expect(list.body.passkeys).toHaveLength(1);
    const me = await maria.get("/api/auth/me");
    expect(me.body.user.passkeyCount).toBe(1);
  });

  it("asks the device not to add a key it already has", async () => {
    const maria = await t.as("maria");
    await addPasskey(maria, "cred-1");
    await maria.post("/api/account/passkeys/options");
    expect(t.passkeys.lastExclude).toEqual([
      { id: "cred-1", transports: ["internal"] },
    ]);
    const again = await addPasskey(maria, "cred-1");
    expect(again.status).toBe(400);
    expect(again.body.message).toContain("already added");
  });

  it("refuses an answer to the wrong challenge, a reused one, or a late one", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/account/passkeys/options");
    const wrong = await maria.post("/api/account/passkeys").send({
      name: "Phone",
      response: deviceAnswer("cred-1", "made-up"),
    });
    expect(wrong.status).toBe(400);

    // The challenge was used up by that answer
    const reused = await maria.post("/api/account/passkeys").send({
      name: "Phone",
      response: deviceAnswer("cred-1", "made-up"),
    });
    expect(reused.body.message).toContain("took too long");

    const options = await maria.post("/api/account/passkeys/options");
    t.clock.advance(5 * 60 * 1000);
    const late = await maria.post("/api/account/passkeys").send({
      name: "Phone",
      response: deviceAnswer("cred-1", options.body.challenge),
    });
    expect(late.status).toBe(400);
    expect(late.body.message).toContain("took too long");
  });

  it("needs a name", async () => {
    const maria = await t.as("maria");
    const response = await addPasskey(maria, "cred-1", "   ");
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("name");
  });

  it("needs someone signed in, with the website unlocked", async () => {
    expect((await t.api().get("/api/account/passkeys")).status).toBe(401);
    expect((await t.api().post("/api/account/passkeys/options")).status).toBe(
      401,
    );
    const maria = await t.as("maria");
    await maria.post("/api/auth/lock");
    expect((await maria.get("/api/account/passkeys")).status).toBe(423);
  });
});

describe("signing in with a passkey", () => {
  it("signs in without a password, and without the two-step code", async () => {
    await addPasskey(await t.as("maria"), "cred-1");
    await t.pool.query("update users set two_step_enabled = true");

    const browser = t.api();
    const response = await signInWithPasskey(browser, "cred-1");
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(USERS.maria.email);
    expect(t.emails.signInCodes).toHaveLength(0);
    expect((await browser.get("/api/auth/me")).status).toBe(200);

    const list = await browser.get("/api/account/passkeys");
    expect(list.body.passkeys[0].lastUsedAt).not.toBeNull();
  });

  it("offers any passkey on the device (no email typed)", async () => {
    await t.api().post("/api/auth/passkey/options");
    expect(t.passkeys.lastAllow).toBeUndefined();
  });

  it("refuses an unknown passkey, a bad signature, and a replayed counter", async () => {
    await addPasskey(await t.as("maria"), "cred-1");

    const unknown = await signInWithPasskey(t.api(), "cred-404");
    expect(unknown.status).toBe(400);
    expect(unknown.body.message).toContain("doesn't know that passkey");

    const forged = await signInWithPasskey(t.api(), "cred-1", {
      signature: "forged",
    });
    expect(forged.status).toBe(400);

    expect(
      (await signInWithPasskey(t.api(), "cred-1", { counter: 5 })).status,
    ).toBe(200);
    // A copy of the key would repeat an old counter
    expect(
      (await signInWithPasskey(t.api(), "cred-1", { counter: 5 })).status,
    ).toBe(400);
  });

  it("needs a fresh prompt for each answer", async () => {
    await addPasskey(await t.as("maria"), "cred-1");
    const browser = t.api();
    const response = await browser.post("/api/auth/passkey/verify").send({
      response: deviceAnswer("cred-1", "challenge-1"),
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("took too long");
  });

  it("stops working once removed", async () => {
    const maria = await t.as("maria");
    const added = await addPasskey(maria, "cred-1");
    const id = added.body.passkey.id;

    const ana = await t.as("ana");
    expect((await ana.delete(`/api/account/passkeys/${id}`)).status).toBe(404);
    expect((await maria.delete(`/api/account/passkeys/${id}`)).status).toBe(
      204,
    );
    expect((await maria.delete(`/api/account/passkeys/${id}`)).status).toBe(
      404,
    );
    expect((await maria.delete("/api/account/passkeys/abc")).status).toBe(404);
    expect((await signInWithPasskey(t.api(), "cred-1")).status).toBe(400);
  });
});

describe("unlocking with a passkey", () => {
  it("unlocks with your own passkey, not someone else's", async () => {
    const maria = await t.as("maria");
    await addPasskey(maria, "maria-key");
    const ana = await t.as("ana");
    await addPasskey(ana, "ana-key", "Ana's phone");

    await maria.post("/api/auth/lock");
    const options = await maria.post("/api/auth/unlock/passkey/options");
    expect(options.status).toBe(200);
    expect(t.passkeys.lastAllow).toEqual([
      { id: "maria-key", transports: ["internal"] },
    ]);

    const wrongPerson = await maria.post("/api/auth/unlock/passkey").send({
      response: deviceAnswer("ana-key", options.body.challenge),
    });
    expect(wrongPerson.status).toBe(400);
    expect((await maria.get("/api/auth/me")).body.locked).toBe(true);

    const again = await maria.post("/api/auth/unlock/passkey/options");
    const unlocked = await maria.post("/api/auth/unlock/passkey").send({
      response: deviceAnswer("maria-key", again.body.challenge),
    });
    expect(unlocked.status).toBe(200);
    expect((await maria.get("/api/auth/me")).body.locked).toBe(false);
  });

  it("says so when there's no passkey yet", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/auth/lock");
    const response = await maria.post("/api/auth/unlock/passkey/options");
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("haven't added a passkey");
  });

  it("can't use a sign-in prompt to unlock", async () => {
    const maria = await t.as("maria");
    await addPasskey(maria, "maria-key");
    await maria.post("/api/auth/lock");
    const signInPrompt = await maria.post("/api/auth/passkey/options");
    const response = await maria.post("/api/auth/unlock/passkey").send({
      response: deviceAnswer("maria-key", signInPrompt.body.challenge),
    });
    expect(response.status).toBe(400);
  });

  it("needs someone signed in", async () => {
    expect(
      (await t.api().post("/api/auth/unlock/passkey/options")).status,
    ).toBe(401);
  });

  it("keeps working with the password too", async () => {
    const maria = await t.as("maria");
    await addPasskey(maria, "maria-key");
    await maria.post("/api/auth/lock");
    expect(
      (await maria.post("/api/auth/unlock").send({ password: PASSWORD }))
        .status,
    ).toBe(200);
  });
});
