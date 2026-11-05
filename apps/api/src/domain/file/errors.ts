import { FILE_LIMITS, formatBytes } from "@talaan/shared";

export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileError";
  }

  static wrongType() {
    return new FileError(
      "Talaan takes photos (JPG, PNG, WEBP, HEIC) and PDFs. Save it as one of those and try again.",
    );
  }

  static tooBig() {
    return new FileError(
      `That file is over ${formatBytes(FILE_LIMITS.maxBytes)}. Take the photo again at a lower size, or split the PDF.`,
    );
  }

  static tooMany() {
    return new FileError(
      `A record can hold up to ${FILE_LIMITS.perRecord} files. Remove one first, or add another record.`,
    );
  }

  static uploadNotRecognized() {
    return new FileError(
      "That upload couldn't be checked. Please upload the file again.",
    );
  }
}

// The server has nowhere to keep files (no Cloudinary on the live site)
export class FilesNotSetUpError extends Error {
  constructor() {
    super(
      "Uploading files isn't set up on this server yet. Please try again later.",
    );
    this.name = "FilesNotSetUpError";
  }
}
