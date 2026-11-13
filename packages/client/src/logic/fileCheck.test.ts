import { describe, expect, it } from "vitest";
import { fileProblem } from "./fileCheck";

describe("checking a file before upload", () => {
  it("takes photos and PDFs up to 10 MB", () => {
    expect(
      fileProblem({ name: "cbc.jpg", type: "image/jpeg", size: 1000 }),
    ).toBeNull();
    // iPhones sometimes give HEIC with no type
    expect(
      fileProblem({ name: "IMG_0042.HEIC", type: "", size: 1000 }),
    ).toBeNull();
    expect(
      fileProblem({ name: "notes.docx", type: "application/msword", size: 10 }),
    ).toContain("Only photos");
    expect(
      fileProblem({
        name: "big.pdf",
        type: "application/pdf",
        size: 11 * 1024 * 1024,
      }),
    ).toBe("Over 10.0 MB (11.0 MB).");
  });
});
