import { describe, expect, it } from "vitest";
import type { AuditTrail } from "../../src/application/audit/AuditTrail.js";
import { FamilyMembers } from "../../src/application/family/FamilyMembers.js";
import type { FamilyAccess } from "../../src/domain/family/FamilyAccess.js";
import type { FamilyAccessRepository } from "../../src/domain/family/FamilyAccessRepository.js";
import type { FamilyInvitationRepository } from "../../src/domain/family/FamilyInvitationRepository.js";
import type { FamilyProfileRepository } from "../../src/domain/family/FamilyProfileRepository.js";
import {
  canManage,
  canView,
  invitationExpiry,
  invitationStatus,
} from "../../src/domain/family/rules.js";
import { familyInvitationEmail } from "../../src/infrastructure/email/templates/familyInvitationEmail.js";
import { FakeClock } from "../fixtures/clock.js";

const NOW = new Date("2026-11-07T12:00:00Z");
const day = 24 * 60 * 60 * 1000;

describe("invitation rules", () => {
  it("lasts 7 days, then shows as expired", () => {
    const expiresAt = invitationExpiry(NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(7 * day);
    const at = (ms: number) => new Date(NOW.getTime() + ms);
    expect(
      invitationStatus({ status: "pending", expiresAt }, at(6 * day)),
    ).toBe("pending");
    expect(
      invitationStatus({ status: "pending", expiresAt }, at(7 * day)),
    ).toBe("expired");
    // Only waiting invitations expire
    expect(
      invitationStatus({ status: "declined", expiresAt }, at(8 * day)),
    ).toBe("declined");
  });

  it("lets managers and the owner change things, viewers only look", () => {
    expect(canView("view")).toBe(true);
    expect(canManage("view")).toBe(false);
    expect(canManage("manage")).toBe(true);
    expect(canManage("owner")).toBe(true);
    expect(canView(null)).toBe(false);
    expect(canManage(null)).toBe(false);
  });
});

describe("who can do what with whose records", () => {
  const grants: FamilyAccess[] = [
    {
      ownerId: "nanay",
      memberId: "anak",
      relationship: "Anak",
      access: "manage",
      createdAt: NOW,
    },
  ];
  const access = {
    find: async (ownerId: string, memberId: string) =>
      grants.find((g) => g.ownerId === ownerId && g.memberId === memberId) ??
      null,
  } as FamilyAccessRepository;
  const members = new FamilyMembers(
    access,
    {} as FamilyInvitationRepository,
    {} as FamilyProfileRepository,
    new FakeClock(NOW),
    {} as AuditTrail,
  );

  it("is one way", async () => {
    expect(await members.roleFor("nanay", "nanay")).toBe("owner");
    expect(await members.roleFor("anak", "nanay")).toBe("manage");
    // Nanay invited Anak; that doesn't let Nanay see Anak's records
    expect(await members.roleFor("nanay", "anak")).toBeNull();
    expect(await members.roleFor("stranger", "nanay")).toBeNull();
  });
});

describe("the invitation email", () => {
  it("escapes names and explains what accepting means", () => {
    const email = familyInvitationEmail(
      "ana@example.com",
      {
        inviterName: "Maria <b>Santos</b>",
        relationship: "Anak",
        access: "manage",
        token: "tok",
        expiresAt: new Date("2026-11-14T03:00:00Z"),
      },
      { invitationUrl: "https://talaan.example/invite/tok" },
      { timeZone: "Asia/Manila" },
    );
    expect(email.subject).toContain("Maria <b>Santos</b> invited you");
    expect(email.html).toContain("Maria &lt;b&gt;Santos&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Santos</b>");
    expect(email.html).toContain("https://talaan.example/invite/tok");
    expect(email.text).toContain("Can manage.");
    expect(email.text).toContain("November 14, 2026");
  });
});
