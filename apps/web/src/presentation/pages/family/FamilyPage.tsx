import { useFamily } from "../../../application/family/useFamily";
import { MembersSection } from "../../components/family/MembersSection";
import { ProfilesSection } from "../../components/family/ProfilesSection";
import { SharedWithMeSection } from "../../components/family/SharedWithMeSection";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

export function FamilyPage() {
  const family = useFamily();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Family</h1>
        <p className="text-muted">
          Share your records one way: the people you invite see yours, and you
          see theirs only if they invite you too.
        </p>
      </div>
      {family.isPending && <Loading />}
      {family.isError && <ErrorAlert message={errorMessage(family.error)} />}
      {family.data && (
        <>
          <MembersSection
            members={family.data.members}
            invitations={family.data.invitations}
          />
          <ProfilesSection profiles={family.data.profiles} />
          <SharedWithMeSection shared={family.data.sharedWithMe} />
        </>
      )}
    </main>
  );
}
