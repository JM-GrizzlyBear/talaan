import type { FamilyProfileInfo } from "@talaan/shared";
import { Baby } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { buttonSecondary, listCard } from "../ui/styles";
import { ProfileForm } from "./ProfileForm";
import { ProfileRow } from "./ProfileRow";

// Profiles for family without email (a child, a lolo)
export function ProfilesSection({
  profiles,
}: {
  profiles: FamilyProfileInfo[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section aria-labelledby="profiles-heading" className="flex flex-col gap-3">
      <SectionHeading id="profiles-heading" icon={<Baby className="size-5" />}>
        Family without email
      </SectionHeading>
      <p className="text-sm text-muted">
        For a child or a lolo without a phone or email. You keep their records
        in your account, and the people who can see your records see theirs too.
      </p>
      {profiles.length > 0 && (
        <ul className={listCard}>
          {profiles.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} />
          ))}
        </ul>
      )}
      {adding ? (
        <ProfileForm
          title="Add a profile"
          submitLabel="Add profile"
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${buttonSecondary} self-start`}
        >
          Add a profile
        </button>
      )}
    </section>
  );
}
