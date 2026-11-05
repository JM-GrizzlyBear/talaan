import type { FamilyMemberInfo, SentInvitationInfo } from "@talaan/shared";
import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Notice } from "../ui/Notice";
import { SectionHeading } from "../ui/SectionHeading";
import { buttonSecondary, listCard } from "../ui/styles";
import { InvitationRow } from "./InvitationRow";
import { InviteForm } from "./InviteForm";
import { MemberRow } from "./MemberRow";

// Who can see my records, invitations still waiting, and inviting someone
export function MembersSection({
  members,
  invitations,
}: {
  members: FamilyMemberInfo[];
  invitations: SentInvitationInfo[];
}) {
  const [inviting, setInviting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <SectionHeading id="members-heading" icon={<Users className="size-5" />}>
        Who can see my records
      </SectionHeading>

      {members.length === 0 && invitations.length === 0 && !inviting && (
        <p className="text-sm text-muted">
          Nobody yet. Invite a family member by email; they accept or decline.
        </p>
      )}
      {members.length > 0 && (
        <ul className={listCard}>
          {members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </ul>
      )}
      {invitations.length > 0 && (
        <>
          <h3 className="mt-2 text-sm font-bold">Invitations</h3>
          <ul className={listCard}>
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        </>
      )}

      {sentTo && !inviting && (
        <Notice>Invitation sent to {sentTo}. It works for 7 days.</Notice>
      )}
      {inviting ? (
        <InviteForm
          onDone={(email) => {
            setInviting(false);
            setSentTo(email);
          }}
          onCancel={() => setInviting(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setInviting(true);
          }}
          className={`${buttonSecondary} self-start`}
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Invite someone
        </button>
      )}
    </section>
  );
}
