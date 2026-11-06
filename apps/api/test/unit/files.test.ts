import { v2 as cloudinary } from "cloudinary";
import { describe, expect, it } from "vitest";
import { FileError } from "../../src/domain/file/errors.js";
import {
  normalizeFormat,
  safeFileName,
  sniffFormat,
} from "../../src/domain/file/rules.js";
import {
  CloudinaryFileStorage,
  parseCloudinaryUrl,
} from "../../src/infrastructure/storage/CloudinaryFileStorage.js";
import { HEIC, JPG, PDF, PNG } from "../fixtures/files.js";

describe("what a file really is", () => {
  it("reads the first bytes", () => {
    expect(sniffFormat(JPG)).toBe("jpg");
    expect(sniffFormat(PNG)).toBe("png");
    expect(sniffFormat(PDF)).toBe("pdf");
    expect(sniffFormat(HEIC)).toBe("heic");
    expect(
      sniffFormat(
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.alloc(4),
          Buffer.from("WEBPVP8 "),
        ]),
      ),
    ).toBe("webp");
    expect(sniffFormat(Buffer.from("<html><script>"))).toBeNull();
    expect(sniffFormat(Buffer.from("GIF89a"))).toBeNull();
  });

  it("uses one name per format", () => {
    expect(normalizeFormat("JPEG")).toBe("jpg");
    expect(normalizeFormat("heif")).toBe("heic");
    expect(normalizeFormat("gif")).toBeNull();
  });

  it("makes download names safe", () => {
    expect(safeFileName("../../etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(safeFileName('lab "result".JPEG', "jpg")).toBe("lab result.JPEG");
    expect(safeFileName("SOA", "pdf")).toBe("SOA.pdf");
    expect(safeFileName("", "png")).toBe("file.png");
  });
});

const settings = {
  cloudName: "demo-cloud",
  apiKey: "123456789",
  apiSecret: "the-api-secret",
  folder: "talaan-test",
};
const storage = new CloudinaryFileStorage(settings);

describe("Cloudinary", () => {
  it("reads CLOUDINARY_URL", () => {
    expect(
      parseCloudinaryUrl("cloudinary://123456789:abc-DEF_9@my-cloud"),
    ).toEqual({
      apiKey: "123456789",
      apiSecret: "abc-DEF_9",
      cloudName: "my-cloud",
    });
    expect(() => parseCloudinaryUrl("https://my-cloud")).toThrow(
      /CLOUDINARY_URL/,
    );
  });

  it("signs uploads so the browser can't change where they go", async () => {
    const target = await storage.uploadTarget("owner-1/record-1");
    expect(target.method).toBe("POST");
    expect(target.url).toBe(
      "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
    );
    expect(target.fileField).toBe("file");
    const { signature, api_key, ...signed } = target.fields;
    expect(api_key).toBe("123456789");
    expect(signed.type).toBe("authenticated");
    expect(signed.overwrite).toBe("false");
    expect(signed.public_id).toMatch(
      /^talaan-test\/owner-1\/record-1\/[0-9a-f]{24}$/,
    );
    expect(signed.allowed_formats).toContain("pdf");
    expect(signature).toBe(
      cloudinary.utils.api_sign_request(signed, "the-api-secret"),
    );
    // The secret itself never goes to the browser
    expect(JSON.stringify(target)).not.toContain("the-api-secret");
  });

  it("only accepts answers signed with the secret, for the right record", async () => {
    const publicId = "talaan-test/owner-1/record-1/abc";
    const version = "1730000000";
    const signature = cloudinary.utils.api_sign_request(
      { public_id: publicId, version },
      "the-api-secret",
    );
    expect(storage.responseSignatureOk(publicId, version, signature)).toBe(
      true,
    );
    expect(storage.responseSignatureOk(publicId, version, "x".repeat(40))).toBe(
      false,
    );

    await expect(
      storage.confirmUpload(
        { public_id: publicId, version, signature: "nope" },
        "owner-1/record-1",
      ),
    ).rejects.toThrow(FileError);
    await expect(
      storage.confirmUpload(
        { public_id: publicId, version, signature },
        "owner-2/record-9",
      ),
    ).rejects.toThrow(FileError);
  });

  it("reads files only through signed addresses", () => {
    const thumb = storage.addressFor(
      { key: "talaan-test/o/r/abc", format: "pdf" },
      "thumb",
    );
    expect(thumb).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo-cloud\/image\/authenticated\/s--[\w-]{8}--\/c_limit,h_480,pg_1,q_auto,w_480\/v1\/talaan-test\/o\/r\/abc\.jpg$/,
    );
    const original = new URL(
      storage.addressFor(
        { key: "talaan-test/o/r/abc", format: "pdf" },
        "original",
      ),
    );
    expect(original.origin + original.pathname).toBe(
      "https://api.cloudinary.com/v1_1/demo-cloud/image/download",
    );
    expect(original.searchParams.get("type")).toBe("authenticated");
    expect(Number(original.searchParams.get("expires_at"))).toBeGreaterThan(
      Date.now() / 1000,
    );
    expect(original.searchParams.get("signature")).toBeTruthy();
  });
});
