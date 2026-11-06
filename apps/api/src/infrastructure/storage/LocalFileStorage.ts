import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  FILE_LIMITS,
  type FileFormat,
  type UploadTarget,
} from "@talaan/shared";
import type {
  FileStorage,
  OpenedFile,
} from "../../application/ports/FileStorage.js";
import type { StoredFile } from "../../domain/file/RecordFile.js";
import { FileError } from "../../domain/file/errors.js";
import { CONTENT_TYPES, sniffFormat } from "../../domain/file/rules.js";

const UPLOAD_MINUTES = 15;

// For a computer without Cloudinary (and the tests): files go in a folder.
// Same steps as Cloudinary: a signed address to upload to, a signed answer
// to attach with. Not for the live site.
export class LocalFileStorage implements FileStorage {
  constructor(
    private readonly dir: string,
    private readonly secret: string,
    // Where the API takes the uploads (PUT /api/uploads/local)
    private readonly uploadUrl = "/api/uploads/local",
  ) {}

  private sign(...parts: string[]) {
    return createHmac("sha256", this.secret)
      .update(parts.join("|"))
      .digest("hex");
  }

  private same(a: string, b: string) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  }

  // The key is never used as a path: files are named by its hash
  private pathFor(key: string) {
    return path.join(this.dir, createHash("sha256").update(key).digest("hex"));
  }

  async uploadTarget(keyPrefix: string): Promise<UploadTarget> {
    const key = `local/${keyPrefix}/${randomBytes(12).toString("hex")}`;
    const expires = String(Date.now() + UPLOAD_MINUTES * 60 * 1000);
    const query = new URLSearchParams({
      key,
      expires,
      signature: this.sign("upload", key, expires),
    });
    return {
      method: "PUT",
      url: `${this.uploadUrl}?${query}`,
      fields: {},
      fileField: null,
    };
  }

  // PUT /api/uploads/local: keeps the file and answers like Cloudinary does
  async receive(
    query: { key?: unknown; expires?: unknown; signature?: unknown },
    body: Buffer,
  ) {
    const key = String(query.key ?? "");
    const expires = String(query.expires ?? "");
    if (
      !key ||
      Number(expires) < Date.now() ||
      !this.same(
        this.sign("upload", key, expires),
        String(query.signature ?? ""),
      )
    ) {
      throw FileError.uploadNotRecognized();
    }
    if (body.length === 0) throw FileError.wrongType();
    if (body.length > FILE_LIMITS.maxBytes) throw FileError.tooBig();
    const format = sniffFormat(body.subarray(0, 16));
    if (!format) throw FileError.wrongType();

    await mkdir(this.dir, { recursive: true });
    const file = this.pathFor(key);
    await writeFile(file, body, { flag: "wx" }).catch(() => {
      throw FileError.uploadNotRecognized();
    });
    await writeFile(
      `${file}.json`,
      JSON.stringify({ format, bytes: body.length }),
    );
    const version = String(Date.now());
    return {
      public_id: key,
      version,
      signature: this.sign("stored", key, version),
      format,
      bytes: body.length,
    };
  }

  async confirmUpload(
    response: unknown,
    keyPrefix: string,
  ): Promise<StoredFile> {
    const answer = (response ?? {}) as Record<string, unknown>;
    const key = String(answer.public_id ?? "");
    const version = String(answer.version ?? "");
    if (
      !key.startsWith(`local/${keyPrefix}/`) ||
      !this.same(
        this.sign("stored", key, version),
        String(answer.signature ?? ""),
      )
    ) {
      throw FileError.uploadNotRecognized();
    }
    const meta = JSON.parse(
      await readFile(`${this.pathFor(key)}.json`, "utf8").catch(() => {
        throw FileError.uploadNotRecognized();
      }),
    ) as { format: FileFormat; bytes: number };
    return {
      key,
      format: meta.format,
      bytes: meta.bytes,
      width: null,
      height: null,
      pages: null,
    };
  }

  // No resizing locally: every variant is the original
  async open(file: { key: string; format: FileFormat }): Promise<OpenedFile> {
    return {
      body: createReadStream(this.pathFor(file.key)),
      contentType: CONTENT_TYPES[file.format],
    };
  }

  async remove(key: string) {
    const file = this.pathFor(key);
    await rm(file, { force: true });
    await rm(`${file}.json`, { force: true });
  }
}
