import { describe, expect, it } from "vitest";
import { MARIAS_NOTE } from "../fixtures/notes.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

describe("notes need a login", () => {
  it("every notes route answers 401 without one", async () => {
    const guest = t.api();
    expect((await guest.get("/api/notes")).status).toBe(401);
    expect((await guest.post("/api/notes").send({ title: "x" })).status).toBe(
      401,
    );
    expect((await guest.get(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(401);
    expect(
      (await guest.put(`/api/notes/${MARIAS_NOTE.id}`).send({ title: "x" }))
        .status,
    ).toBe(401);
    expect((await guest.delete(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(
      401,
    );
  });
});

describe("create, read, update, delete", () => {
  it("creates a note and lists it first", async () => {
    const maria = await t.as("maria");
    const created = await maria
      .post("/api/notes")
      .send({ title: "  Call mom  ", body: "Sunday" });
    expect(created.status).toBe(201);
    expect(created.body.note).toMatchObject({
      title: "Call mom",
      body: "Sunday",
    });

    const list = await maria.get("/api/notes");
    expect(list.body.notes.map((n: { title: string }) => n.title)).toEqual([
      "Call mom",
      "Groceries",
    ]);
  });

  it("reads one note", async () => {
    const maria = await t.as("maria");
    const response = await maria.get(`/api/notes/${MARIAS_NOTE.id}`);
    expect(response.status).toBe(200);
    expect(response.body.note).toMatchObject({
      title: "Groceries",
      body: "Milk, eggs",
    });
  });

  it("updates a note and moves its updated time forward", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .put(`/api/notes/${MARIAS_NOTE.id}`)
      .send({ title: "Groceries", body: "Milk, eggs, bread" });
    expect(response.status).toBe(200);
    expect(response.body.note.body).toBe("Milk, eggs, bread");
    expect(new Date(response.body.note.updatedAt).getTime()).toBeGreaterThan(
      new Date(response.body.note.createdAt).getTime(),
    );
  });

  it("deletes a note", async () => {
    const maria = await t.as("maria");
    expect((await maria.delete(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(
      204,
    );
    expect((await maria.get(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(404);
    expect((await maria.get("/api/notes")).body.notes).toEqual([]);
  });

  it("checks the fields", async () => {
    const maria = await t.as("maria");
    const empty = await maria.post("/api/notes").send({ title: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.errors).toHaveProperty("title");

    const tooLong = await maria
      .post("/api/notes")
      .send({ title: "x".repeat(121) });
    expect(tooLong.status).toBe(400);
  });
});

describe("other people's notes", () => {
  it("are invisible: reading, changing or deleting them is a 404", async () => {
    const ana = await t.as("ana");
    expect((await ana.get("/api/notes")).body.notes).toEqual([]);
    expect((await ana.get(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(404);
    expect(
      (
        await ana
          .put(`/api/notes/${MARIAS_NOTE.id}`)
          .send({ title: "Mine now" })
      ).status,
    ).toBe(404);
    expect((await ana.delete(`/api/notes/${MARIAS_NOTE.id}`)).status).toBe(404);

    // Still there, unchanged, for Maria
    const maria = await t.as("maria");
    expect(
      (await maria.get(`/api/notes/${MARIAS_NOTE.id}`)).body.note.title,
    ).toBe("Groceries");
  });

  it("an id that isn't a real id is a 404, not an error", async () => {
    const maria = await t.as("maria");
    expect((await maria.get("/api/notes/not-an-id")).status).toBe(404);
  });
});

describe("the API itself", () => {
  it("answers health checks", async () => {
    expect((await t.api().get("/api/health")).body).toEqual({ ok: true });
  });

  it("unknown routes and broken JSON get clear JSON errors", async () => {
    expect((await t.api().get("/api/nope")).status).toBe(404);
    const broken = await t
      .api()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{oops");
    expect(broken.status).toBe(400);
    expect(broken.body).toHaveProperty("message");
  });
});
