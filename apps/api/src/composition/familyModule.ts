import { FamilyInvitations } from "../application/family/FamilyInvitations.js";
import { FamilyMembers } from "../application/family/FamilyMembers.js";
import { FamilyProfiles } from "../application/family/FamilyProfiles.js";
import { familyProfileRoutes } from "../presentation/http/routes/familyProfileRoutes.js";
import { familyRoutes } from "../presentation/http/routes/familyRoutes.js";
import { invitationRoutes } from "../presentation/http/routes/invitationRoutes.js";
import type { AppContext } from "./context.js";

// Family: invitations by email, who can see whose records, and profiles for
// family without email. "members" decides access for the records too.
export function familyModule({
  options,
  repos,
  limits,
  audit,
  requireAuth,
}: AppContext) {
  const members = new FamilyMembers(
    repos.familyAccess,
    repos.familyInvitations,
    repos.familyProfiles,
    options.clock,
    audit,
  );

  const routers = [
    invitationRoutes({
      invitations: new FamilyInvitations(
        repos.users,
        repos.familyInvitations,
        repos.familyAccess,
        options.secretCodes,
        options.clock,
        options.emails,
        audit,
      ),
      requireAuth,
      limit: limits.tries(),
      userLimit: limits.tries(limits.userKey),
      inviteEmailLimit: limits.inviteEmail,
      resendLimit: limits.invitationResend,
    }),
    familyRoutes({
      members,
      requireAuth,
      userLimit: limits.tries(limits.userKey),
    }),
    familyProfileRoutes({
      profiles: new FamilyProfiles(repos.familyProfiles, repos.records, audit),
      requireAuth,
      userLimit: limits.tries(limits.userKey),
    }),
  ];
  return { routers, members };
}
