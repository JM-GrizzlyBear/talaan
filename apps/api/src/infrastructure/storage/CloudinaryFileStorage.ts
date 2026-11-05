import { randomBytes, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import {
  FILE_FORMATS,
  FILE_LIMITS,
  type FileFormat,
  type FileVariant,
  type UploadTarget,
} from "@talaan/shared";
import { v2 as cloudinary } from "cloudinary";
import type {
  FileStorage,
  OpenedFile,
} from "../../application/ports/FileStorage.js";
import { FileError } from "../../domain/file/errors.js";
import { CONTENT_TYPES, normalizeFormat } from "../../domain/file/rules.js";

export interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  // Top folder in Cloudinary, so the live site and testing don't mix ("talaan", "talaan-dev")
  folder: string;
}

// CLOUDINARY_URL from the Cloudinary dashboard: cloudinary://<key>:<secret>@<cloud name>
export function parseCloudinaryUrl(value: string) {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@([\w-]+)$/.exec(value.trim());
  if (!match) {
    throw new Error(
      "CLOUDINARY_URL must look like cloudinary://<api key>:<api secret>@<cloud name>",
    );
  }
  return {
    apiKey: decodeURIComponent(match[1]),
    apiSecret: decodeURIComponent(match[2]),
    cloudName: match[3],
  };
}

// Files are "authenticated": they have no public link. Every way to read one
// is signed with the API secret, and only the API (after checking who's
// asking) ever asks Cloudinary for it.
const TYPE = "authenticated";
const RESOURCE = "image"; // Cloudinary keeps photos and PDFs as images
// How long a download link made for the API itself stays valid
const DOWNLOAD_SECONDS = 120;

const VARIANTS: Record<Exclude<FileVariant, "original">, object> = {
  // Page 1 for PDFs; HEIC turned into JPG
  thumb: { width: 480, height: 480, crop: "limit", page: 1, quality: "auto" },
  preview: { width: 1600, height: 1600, crop: "limit", quality: "auto" },
};

export class CloudinaryFileStorage implements FileStorage {
  constructor(private readonly settings: CloudinarySettings) {}

  private get credentials() {
    return {
      cloud_name: this.settings.cloudName,
      api_key: this.settings.apiKey,
      api_secret: this.settings.apiSecret,
    };
  }

  private prefix(keyPrefix: string) {
    return `${this.settings.folder}/${keyPrefix}/`;
  }

  async uploadTarget(keyPrefix: string): Promise<UploadTarget> {
    const publicId = `${this.prefix(keyPrefix)}${randomBytes(12).toString("hex")}`;
    // Signed, so the browser can't change where it goes or what's allowed
    const signed = cloudinary.utils.sign_request(
      {
        timestamp: Math.floor(Date.now() / 1000),
        public_id: publicId,
        type: TYPE,
        overwrite: false,
        allowed_formats: [...FILE_FORMATS, "jpeg", "heif"].join(","),
      },
      this.credentials,
    );
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(signed))
      fields[key] = String(value);
    return {
      method: "POST",
      url: cloudinary.utils.api_url("upload", {
        cloud_name: this.settings.cloudName,
        resource_type: RESOURCE,
      }),
      fields,
      fileField: "file",
    };
  }

  // Cloudinary signs its answer (public_id + version) with the API secret
  responseSignatureOk(publicId: string, version: string, signature: string) {
    const expected = cloudinary.utils.api_sign_request(
      { public_id: publicId, version },
      this.settings.apiSecret,
    );
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async confirmUpload(response: unknown, keyPrefix: string) {
    const answer = (response ?? {}) as Record<string, unknown>;
    const publicId = String(answer.public_id ?? "");
    const version = String(answer.version ?? "");
    const signature = String(answer.signature ?? "");
    if (
      !publicId.startsWith(this.prefix(keyPrefix)) ||
      !this.responseSignatureOk(publicId, version, signature)
    ) {
      throw FileError.uploadNotRecognized();
    }

    // The signed answer proves which file; the details come from Cloudinary itself
    const resource = await cloudinary.api.resource(publicId, {
      type: TYPE,
      resource_type: RESOURCE,
      pages: true,
      ...this.credentials,
    });
    const format = normalizeFormat(String(resource.format));
    if (!format) {
      await this.remove(publicId);
      throw FileError.wrongType();
    }
    if (resource.bytes > FILE_LIMITS.maxBytes) {
      await this.remove(publicId);
      throw FileError.tooBig();
    }
    return {
      key: publicId,
      format,
      bytes: resource.bytes,
      width: format === "pdf" ? null : (resource.width ?? null),
      height: format === "pdf" ? null : (resource.height ?? null),
      pages: format === "pdf" ? (resource.pages ?? null) : null,
    };
  }

  // A signed address, used only by the API (never sent to the browser)
  addressFor(file: { key: string; format: FileFormat }, variant: FileVariant) {
    if (
      variant === "original" ||
      (variant === "preview" && file.format === "pdf")
    ) {
      return cloudinary.utils.private_download_url(file.key, file.format, {
        type: TYPE,
        resource_type: RESOURCE,
        expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_SECONDS,
        ...this.credentials,
      });
    }
    return cloudinary.url(file.key, {
      type: TYPE,
      resource_type: RESOURCE,
      sign_url: true,
      secure: true,
      format: "jpg",
      transformation: [VARIANTS[variant]],
      // No SDK usage tracking added to the address
      urlAnalytics: false,
      ...this.credentials,
    });
  }

  async open(
    file: { key: string; format: FileFormat },
    variant: FileVariant,
  ): Promise<OpenedFile> {
    const response = await fetch(this.addressFor(file, variant));
    if (!response.ok || !response.body) {
      throw new Error(
        `Cloudinary answered ${response.status} for ${file.key} (${variant})`,
      );
    }
    const isOriginal =
      variant === "original" ||
      (variant === "preview" && file.format === "pdf");
    return {
      body: Readable.fromWeb(response.body as never),
      contentType: isOriginal ? CONTENT_TYPES[file.format] : "image/jpeg",
    };
  }

  async remove(key: string) {
    await cloudinary.uploader.destroy(key, {
      type: TYPE,
      resource_type: RESOURCE,
      invalidate: true,
      ...this.credentials,
    });
  }
}
