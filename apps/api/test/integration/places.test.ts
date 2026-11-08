import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JPG, PDF } from "../fixtures/files.js";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;

async function addPlace(
  browser: Browser,
  name: string,
  more: { kind?: string; parentId?: string | null; ownerId?: string } = {},
) {
  const response = await browser.post("/api/places").send({
    ownerId: more.ownerId ?? USERS.maria.id,
    kind: more.kind ?? "box",
    name,
    parentId: more.parentId ?? null,
  });
  expect(response.status).toBe(201);
  return response.body.place as { id: string; code: string };
}

async function addRecord(browser: Browser, placeId: string | null) {
  const response = await browser.post("/api/records").send({
    ownerId: USERS.maria.id,
    type: "imaging",
    title: "Chest X-ray",
    recordDate: "2026-10-15",
    placeId,
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

async function activity(browser: Browser) {
  const response = await browser.get("/api/activity");
  return response.body.entries.map(
    (e: { action: string; subject: string }) => `${e.action}: ${e.subject}`,
  ) as string[];
}

// The browser's two steps for the photo, as for record files
async function uploadPhoto(browser: Browser, placeId: string, body: Buffer) {
  const target = await browser.post(
    `/api/places/${placeId}/photo/upload-target`,
  );
  if (target.status !== 200) return target;
  const stored = await browser
    .put(target.body.target.url)
    .set("Content-Type", "application/octet-stream")
    .send(body);
  expect(stored.status).toBe(200);
  return await browser
    .post(`/api/places/${placeId}/photo`)
    .send({ upload: stored.body });
}

const storedFiles = () =>
  readdirSync(t.uploadsDir).filter((f) => !f.endsWith(".json"));

describe("places", () => {
  it("adds places inside places, each with its own label", async () => {
    const maria = await t.as("maria");
    const drawer = await addPlace(maria, "Bedroom drawer", { kind: "drawer" });
    const box = await addPlace(maria, "Blue box", { parentId: drawer.id });
    const folder = await addPlace(maria, "Lola's X-rays", {
      kind: "folder",
      parentId: box.id,
    });
    expect(drawer.code).toMatch(/^[2-9A-Z]{8}$/);
    expect(new Set([drawer.code, box.code, folder.code]).size).toBe(3);

    const shown = (await maria.get(`/api/places/${folder.id}`)).body.place;
    expect(shown).toMatchObject({
      name: "Lola's X-rays",
      kind: "folder",
      role: "owner",
      hasPhoto: false,
      path: [
        { id: drawer.id, name: "Bedroom drawer" },
        { id: box.id, name: "Blue box" },
      ],
    });
    const list = (await maria.get("/api/places")).body;
    expect(list.role).toBe("owner");
    expect(list.places.map((p: { name: string }) => p.name)).toEqual([
      "Bedroom drawer",
      "Blue box",
      "Lola's X-rays",
    ]);
    expect(
      (await maria.get(`/api/places/${drawer.id}`)).body.place.children,
    ).toMatchObject([{ name: "Blue box", placeCount: 1 }]);
  });

  it("goes at most 3 levels deep, and never inside itself", async () => {
    const maria = await t.as("maria");
    const a = await addPlace(maria, "Cabinet", { kind: "cabinet" });
    const b = await addPlace(maria, "Drawer", { parentId: a.id });
    const c = await addPlace(maria, "Folder", { parentId: b.id });
    const fourth = await maria.post("/api/places").send({
      ownerId: USERS.maria.id,
      kind: "envelope",
      name: "Too deep",
      parentId: c.id,
    });
    expect(fourth.status).toBe(403);
    expect(fourth.body.message).toMatch(/at most 3 levels/);

    const intoChild = await maria
      .put(`/api/places/${a.id}`)
      .send({ kind: "cabinet", name: "Cabinet", parentId: c.id });
    expect(intoChild.status).toBe(403);
    expect(intoChild.body.message).toMatch(/inside itself/);

    // The drawer (with its folder inside) into a box in the cabinet: 4 levels
    const other = await addPlace(maria, "Shelf box", { parentId: a.id });
    const move = await maria
      .put(`/api/places/${b.id}`)
      .send({ kind: "drawer", name: "Drawer", parentId: other.id });
    expect(move.status).toBe(403);
    // Into the cabinet's other box when it's at the top: 3 levels, fine
    await maria
      .put(`/api/places/${other.id}`)
      .send({ kind: "box", name: "Shelf box", parentId: null });
    const fits = await maria
      .put(`/api/places/${b.id}`)
      .send({ kind: "drawer", name: "Drawer", parentId: other.id });
    expect(fits.status).toBe(200);
  });

  it("keeps a record in a place, shows where, and logs moves", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    const folder = await addPlace(maria, "X-ray folder", {
      kind: "folder",
      parentId: box.id,
    });
    const created = await addRecord(maria, folder.id);
    expect(created.status).toBe(201);
    expect(created.body.record.place).toEqual({
      id: folder.id,
      path: [
        { id: box.id, name: "Blue box" },
        { id: folder.id, name: "X-ray folder" },
      ],
    });
    const id = created.body.record.id;

    const inFolder = await maria.get(
      `/api/records?ownerId=${USERS.maria.id}&placeId=${folder.id}`,
    );
    expect(inFolder.body.records).toHaveLength(1);
    expect(
      (await maria.get(`/api/places/${folder.id}`)).body.place.recordCount,
    ).toBe(1);

    const moved = await maria.put(`/api/records/${id}`).send({
      type: "imaging",
      title: "Chest X-ray",
      recordDate: "2026-10-15",
      placeId: box.id,
    });
    expect(moved.status).toBe(200);
    const history = (await maria.get(`/api/records/${id}/history`)).body
      .entries;
    expect(history[0].changes).toContainEqual({
      field: "Kept in",
      from: "Blue box › X-ray folder",
      to: "Blue box",
    });
  });

  it("refuses a place from another account", async () => {
    const ana = await t.as("ana");
    const anasBox = await addPlace(ana, "Ana's box", {
      ownerId: USERS.ana.id,
    });
    const maria = await t.as("maria");
    const response = await addRecord(maria, anasBox.id);
    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/isn't there anymore/);
  });

  it("only the owner removes a place; nothing inside is lost", async () => {
    const { maria, ana } = await share("manage");
    const drawer = await addPlace(maria, "Drawer", { kind: "drawer" });
    const box = await addPlace(ana, "Box from Ana", { parentId: drawer.id });
    const inner = await addPlace(maria, "Folder", {
      kind: "folder",
      parentId: box.id,
    });
    const record = (await addRecord(maria, box.id)).body.record;

    expect((await ana.delete(`/api/places/${box.id}`)).status).toBe(403);
    expect((await maria.delete(`/api/places/${box.id}`)).status).toBe(204);

    expect((await maria.get(`/api/places/${box.id}`)).status).toBe(404);
    expect(
      (await maria.get(`/api/places/${inner.id}`)).body.place.parentId,
    ).toBe(drawer.id);
    expect(
      (await maria.get(`/api/records/${record.id}`)).body.record.place.id,
    ).toBe(drawer.id);

    // Its label is still stuck on the box: it's blank now, ready to be named
    const label = (await maria.get(`/api/labels/${box.code}`)).body.label;
    expect(label.placeId).toBeNull();
    expect(await activity(maria)).toEqual(
      expect.arrayContaining([
        "place.created: Box from Ana",
        "place.removed: Box from Ana",
      ]),
    );
  });

  it("lets “Can view” family look, but not change anything", async () => {
    const { maria, ana } = await share("view");
    const box = await addPlace(maria, "Blue box");
    expect((await ana.get(`/api/places/${box.id}`)).body.place.role).toBe(
      "view",
    );
    expect(
      (await ana.get(`/api/places?ownerId=${USERS.maria.id}`)).body.places,
    ).toHaveLength(1);
    const add = await ana.post("/api/places").send({
      ownerId: USERS.maria.id,
      kind: "box",
      name: "Mine now",
    });
    expect(add.status).toBe(403);
    const edit = await ana
      .put(`/api/places/${box.id}`)
      .send({ kind: "box", name: "Renamed" });
    expect(edit.status).toBe(403);
  });

  it("hides places and labels from everyone they aren't shared with", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    const ana = await t.as("ana");
    expect((await ana.get(`/api/places/${box.id}`)).status).toBe(404);
    expect((await ana.get(`/api/labels/${box.code}`)).status).toBe(404);
    expect(
      (await ana.get(`/api/places?ownerId=${USERS.maria.id}`)).status,
    ).toBe(404);
    expect((await ana.get("/api/labels/NOT-REAL")).status).toBe(404);
  });
});

describe("QR labels", () => {
  it("finds a place by its label, however the code is typed", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    const typed = `${box.code.slice(0, 4)}-${box.code.slice(4)}`.toLowerCase();
    const response = await maria.get(`/api/labels/${typed}`);
    expect(response.status).toBe(200);
    expect(response.body.label).toEqual({
      code: box.code,
      ownerId: USERS.maria.id,
      ownerName: "Maria Lopez Santos",
      role: "owner",
      placeId: box.id,
    });
  });

  it("makes blank labels to print now and name when first scanned", async () => {
    const { maria, ana } = await share("manage");
    const made = await maria
      .post("/api/labels/blank")
      .send({ ownerId: USERS.maria.id, count: 3 });
    expect(made.status).toBe(201);
    const codes: string[] = made.body.codes;
    expect(codes).toHaveLength(3);

    const blank = await maria.get("/api/labels/blank");
    expect(
      blank.body.labels.map((l: { code: string }) => l.code).sort(),
    ).toEqual([...codes].sort());
    expect((await ana.get(`/api/labels/${codes[0]}`)).body.label).toMatchObject(
      {
        placeId: null,
        role: "manage",
      },
    );

    // Ana scans one and names it
    const named = await ana
      .post(`/api/labels/${codes[0]}/place`)
      .send({ kind: "envelope", name: "Brown envelope" });
    expect(named.status).toBe(201);
    expect(named.body.place).toMatchObject({
      code: codes[0],
      name: "Brown envelope",
      ownerId: USERS.maria.id,
    });
    const again = await maria
      .post(`/api/labels/${codes[0]}/place`)
      .send({ kind: "box", name: "Twice" });
    expect(again.status).toBe(403);
    expect((await maria.get("/api/labels/blank")).body.labels).toHaveLength(2);
    expect(await activity(maria)).toEqual(
      expect.arrayContaining([
        "labels.created: 3 blank labels",
        "place.created: Brown envelope",
      ]),
    );
  });

  it("limits blank labels, and only managers make or name them", async () => {
    const { maria, ana } = await share("view");
    const tooMany = await maria
      .post("/api/labels/blank")
      .send({ ownerId: USERS.maria.id, count: 121 });
    expect(tooMany.status).toBe(400);
    const byViewer = await ana
      .post("/api/labels/blank")
      .send({ ownerId: USERS.maria.id, count: 2 });
    expect(byViewer.status).toBe(403);

    const codes = (
      await maria
        .post("/api/labels/blank")
        .send({ ownerId: USERS.maria.id, count: 1 })
    ).body.codes;
    const naming = await ana
      .post(`/api/labels/${codes[0]}/place`)
      .send({ kind: "box", name: "Not allowed" });
    expect(naming.status).toBe(403);
  });
});

describe("a place's photo", () => {
  it("adds, shows, replaces and removes the photo", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    const added = await uploadPhoto(maria, box.id, JPG);
    expect(added.status).toBe(200);
    expect(added.body.place.hasPhoto).toBe(true);
    expect(storedFiles()).toHaveLength(1);

    const photo = await maria.get(`/api/places/${box.id}/photo?variant=thumb`);
    expect(photo.status).toBe(200);
    expect(photo.headers["content-type"]).toMatch(/^image\//);

    // A new photo replaces the old one in storage
    await uploadPhoto(maria, box.id, JPG);
    expect(storedFiles()).toHaveLength(1);

    expect((await maria.delete(`/api/places/${box.id}/photo`)).status).toBe(
      204,
    );
    expect(storedFiles()).toEqual([]);
    expect((await maria.get(`/api/places/${box.id}/photo`)).status).toBe(404);
  });

  it("takes photos only, not PDFs", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    const response = await uploadPhoto(maria, box.id, PDF);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/has to be a photo/);
    expect(storedFiles()).toEqual([]);
  });

  it("lets “Can view” family see it but not change it, and hides it from others", async () => {
    const { maria, ana } = await share("view");
    const box = await addPlace(maria, "Blue box");
    await uploadPhoto(maria, box.id, JPG);
    expect((await ana.get(`/api/places/${box.id}/photo`)).status).toBe(200);
    expect(
      (await ana.post(`/api/places/${box.id}/photo/upload-target`)).status,
    ).toBe(403);
    expect((await ana.delete(`/api/places/${box.id}/photo`)).status).toBe(403);

    await ana.post("/api/family/leave").send({ ownerId: USERS.maria.id });
  });

  it("removes the stored photo when the place is removed", async () => {
    const maria = await t.as("maria");
    const box = await addPlace(maria, "Blue box");
    await uploadPhoto(maria, box.id, JPG);
    expect(storedFiles()).toHaveLength(1);
    await maria.delete(`/api/places/${box.id}`);
    expect(storedFiles()).toEqual([]);
  });
});
