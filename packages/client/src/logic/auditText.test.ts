import type { AuditEntryInfo } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { auditSentence, changeText } from "./auditText";

const entry = (over: Partial<AuditEntryInfo>): AuditEntryInfo => ({
  id: "1",
  action: "record.created",
  actorName: "Ana Reyes",
  subject: "CBC",
  recordId: "r1",
  changes: [],
  at: "2026-11-05T10:00:00Z",
  ...over,
});

describe("history sentences", () => {
  it("says who did what to which record", () => {
    expect(auditSentence(entry({}))).toBe("Ana Reyes added “CBC”");
    expect(auditSentence(entry({ action: "record.trashed" }))).toBe(
      "Ana Reyes moved “CBC” to the Trash",
    );
    expect(
      auditSentence(entry({ action: "record.purged", actorName: null })),
    ).toBe("Talaan deleted “CBC” for good after 30 days in the Trash");
    expect(
      auditSentence(
        entry({
          action: "family.accepted",
          subject: "Ana Reyes (ana@example.com)",
        }),
      ),
    ).toBe("Ana Reyes (ana@example.com) accepted the invitation");
  });

  it("shows before and after for edits", () => {
    expect(
      changeText(
        { field: "Hemoglobin result", from: "6.0 g/dL", to: "8.0 g/dL" },
        "record.edited",
      ),
    ).toBe("Hemoglobin result: 6.0 g/dL → 8.0 g/dL");
    expect(
      changeText(
        { field: "Doctor", from: null, to: "Dr. Cruz" },
        "record.edited",
      ),
    ).toBe("Doctor: (empty) → Dr. Cruz");
    expect(
      changeText(
        { field: "Notes", from: "Fasting", to: null },
        "record.edited",
      ),
    ).toBe("Notes: Fasting → (empty)");
    expect(
      changeText(
        { field: "Lab test removed", from: "WBC: 9", to: null },
        "record.edited",
      ),
    ).toBe("Lab test removed: WBC: 9");
    expect(
      changeText(
        { field: "Access", from: null, to: "Can view" },
        "family.invited",
      ),
    ).toBe("Access: Can view");
  });
});
