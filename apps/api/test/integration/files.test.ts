import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JPG, PDF } from "../fixtures/files.js";
import { USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
type Browser = Awaited<ReturnType<typeof t.as>>;
const DAY = 24 * 60 * 60 * 1000;

const record = {
  ownerId: USERS.maria.id,
  type: "lab",
  title: "CBC",
  recordDate: "2026-10-15",
};

async function addRecord(browser: Browser) {
  const response = await browser.post("/api/records").send(record);
  expect(response.status).toBe(201);
  return response.body.record.id as string;
}

// The browser's two steps: send the file where it's told, then attach what came back
async function upload(browser: Browser, recordId: string, body: Buffer) {
  const target = await browser.post(
    `/api/records/${recordId}/files/upload-target`,
  );
  if (target.status !== 200) return target;
  expect(target.body.target).toMatchObject({ method: "PUT", fileField: null });
  return await browser
    .put(target.body.target.url)
    .set("Content-Type", "application/octet-stream")
    .send(body);
}

async function attach(
  browser: Browser,
  recordId: string,
  body: Buffer,
  name = "cbc.jpg",
) {
  const stored = await upload(browser, recordId, body);
  expect(stored.status).toBe(200);
  return await browser
    .post(`/api/records/${recordId}/files`)
    .send({ upload: stored.body, name });
}

const storedFiles = () =>
  readdirSync(t.uploadsDir).filter((f) => !f.endsWith(".json"));

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

describe("attaching files", () => {
  it("uploads a photo, attaches it, and serves it back", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    const response = await attach(maria, recordId, JPG, "CBC page 1.jpg");
    expect(response.status).toBe(201);
    expect(response.body.file).toMatchObject({
      name: "CBC page 1.jpg",
      format: "jpg",
      bytes: JPG.length,
      uploadedByName: "Maria Lopez Santos",
    });
    expect(response.body.file).not.toHaveProperty("storageKey");

    const list = await maria.get(`/api/records/${recordId}/files`);
    expect(list.body.files).toHaveLength(1);
    expect((await maria.get("/api/records")).body.records[0].fileCount).toBe(1);

    const id = response.body.file.id;
    const content = await maria
      .get(`/api/files/${id}/content?variant=thumb`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      });
    expect(content.status).toBe(200);
    expect(content.headers["content-type"]).toBe("image/jpeg");
    expect(content.headers["cache-control"]).toBe("private, max-age=300");
    expect(content.headers["content-disposition"]).toContain("inline");
    expect(Buffer.compare(content.body as Buffer, JPG)).toBe(0);

    const download = await maria.get(`/api/files/${id}/content?download=1`);
    expect(download.headers["content-disposition"]).toContain(
      `attachment; filename="CBC page 1.jpg"`,
    );

    const history = await maria.get(`/api/records/${recordId}/history`);
    expect(history.body.entries[0]).toMatchObject({
      action: "record.file_added",
      actorName: "Maria Lopez Santos",
      changes: [{ field: "File", from: null, to: "CBC page 1.jpg" }],
    });
  });

  it("knows a PDF by its content, not its name", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    const response = await attach(maria, recordId, PDF, "scan.jpg");
    expect(response.body.file.format).toBe("pdf");
    const content = await maria.get(
      `/api/files/${response.body.file.id}/content`,
    );
    expect(content.headers["content-type"]).toBe("application/pdf");
  });

  it("refuses other kinds of files, and files over 10 MB", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    const text = await upload(maria, recordId, Buffer.from("just some text"));
    expect(text.status).toBe(400);
    expect(text.body.message).toContain(
      "photos (JPG, PNG, WEBP, HEIC) and PDFs",
    );

    const big = await upload(
      maria,
      recordId,
      Buffer.concat([JPG, Buffer.alloc(10 * 1024 * 1024)]),
    );
    expect(big.status).toBe(413);
    expect(big.body.message).toContain("over 10.0 MB");
    expect(storedFiles()).toEqual([]);
  });

  it("refuses an upload answer that was changed, or belongs to another record", async () => {
    const maria = await t.as("maria");
    const first = await addRecord(maria);
    const second = await addRecord(maria);
    const stored = await upload(maria, first, JPG);

    const tampered = await maria.post(`/api/records/${first}/files`).send({
      upload: { ...stored.body, signature: "0".repeat(64) },
      name: "x.jpg",
    });
    expect(tampered.status).toBe(400);
    expect(tampered.body.message).toContain("couldn't be checked");

    const elsewhere = await maria
      .post(`/api/records/${second}/files`)
      .send({ upload: stored.body, name: "x.jpg" });
    expect(elsewhere.status).toBe(400);
  });

  it("refuses an upload address that was changed", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    const target = await maria.post(
      `/api/records/${recordId}/files/upload-target`,
    );
    const url = target.body.target.url.replace(
      /key=[^&]+/,
      "key=local%2Fsomeone-else%2Fx",
    );
    const response = await maria.put(url).send(JPG);
    expect(response.status).toBe(400);
    expect((await t.api().put(target.body.target.url).send(JPG)).status).toBe(
      401,
    );
  });

  it("holds at most 20 files per record", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    for (let i = 0; i < 20; i++) {
      expect((await attach(maria, recordId, JPG, `page ${i}.jpg`)).status).toBe(
        201,
      );
    }
    const more = await maria.post(
      `/api/records/${recordId}/files/upload-target`,
    );
    expect(more.status).toBe(400);
    expect(more.body.message).toContain("up to 20 files");
  });
});

describe("who can see and change files", () => {
  it("lets “Can view” family see and download, but not add or remove", async () => {
    const { maria, ana } = await share("view");
    const recordId = await addRecord(maria);
    const fileId = (await attach(maria, recordId, JPG)).body.file.id;

    expect(
      (await ana.get(`/api/records/${recordId}/files`)).body.files,
    ).toHaveLength(1);
    expect((await ana.get(`/api/files/${fileId}/content`)).status).toBe(200);
    expect(
      (await ana.post(`/api/records/${recordId}/files/upload-target`)).status,
    ).toBe(403);
    expect((await ana.delete(`/api/files/${fileId}`)).status).toBe(403);
  });

  it("lets “Can manage” family add and remove, and records who did it", async () => {
    const { maria, ana } = await share("manage");
    const recordId = await addRecord(maria);
    const added = await attach(ana, recordId, JPG, "from ana.jpg");
    expect(added.body.file.uploadedByName).toBe("Ana Reyes");
    expect((await ana.delete(`/api/files/${added.body.file.id}`)).status).toBe(
      204,
    );
    expect(storedFiles()).toEqual([]);

    const history = (await maria.get(`/api/records/${recordId}/history`)).body
      .entries;
    expect(
      history
        .slice(0, 2)
        .map((e: { action: string; actorName: string }) => [
          e.action,
          e.actorName,
        ]),
    ).toEqual([
      ["record.file_removed", "Ana Reyes"],
      ["record.file_added", "Ana Reyes"],
    ]);
  });

  it("hides files from everyone the record isn't shared with", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    const fileId = (await attach(maria, recordId, JPG)).body.file.id;
    const ana = await t.as("ana");
    expect((await ana.get(`/api/files/${fileId}/content`)).status).toBe(404);
    expect((await ana.get(`/api/records/${recordId}/files`)).status).toBe(404);
    expect((await t.api().get(`/api/files/${fileId}/content`)).status).toBe(
      401,
    );
  });
});

describe("files and the Trash", () => {
  it("keeps files while in the Trash; only the owner can open them there", async () => {
    const { maria, ana } = await share("manage");
    const recordId = await addRecord(maria);
    const fileId = (await attach(maria, recordId, JPG)).body.file.id;
    await maria.delete(`/api/records/${recordId}`);

    expect((await maria.get(`/api/files/${fileId}/content`)).status).toBe(200);
    expect((await ana.get(`/api/files/${fileId}/content`)).status).toBe(404);
    const add = await maria.post(
      `/api/records/${recordId}/files/upload-target`,
    );
    expect(add.status).toBe(403);
    expect(add.body.message).toContain("Restore the record");
  });

  it("removes the stored files when the record is deleted for good", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    await attach(maria, recordId, JPG);
    await attach(maria, recordId, PDF, "soa.pdf");
    expect(storedFiles()).toHaveLength(2);
    await maria.delete(`/api/records/${recordId}`);
    await maria.delete(`/api/records/${recordId}/forever`);
    expect(storedFiles()).toEqual([]);
  });

  it("removes them too when Talaan empties old Trash", async () => {
    const maria = await t.as("maria");
    const recordId = await addRecord(maria);
    await attach(maria, recordId, JPG);
    await maria.delete(`/api/records/${recordId}`);
    t.clock.advance(30 * DAY);
    expect(await t.app.purgeExpiredTrash()).toBe(1);
    expect(storedFiles()).toEqual([]);
  });
});
