import { useMedicalId, useRecordAccounts } from "@talaan/client";
import { MedicalIdForm } from "../../components/medical/form/MedicalIdForm";
import { usePersonParams } from "../../components/medical/usePersonParams";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

// /medical-id/edit?owner=…&person=…
export function MedicalIdEditPage() {
  const accounts = useRecordAccounts();
  const { person, query } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);
  const back = `/medical-id?${query}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={back}>Back to the Medical ID</BackLink>
      {(accounts.isPending || medicalId.isPending) && <Loading />}
      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {medicalId.isError && (
        <ErrorAlert message={errorMessage(medicalId.error)} />
      )}
      {medicalId.data &&
        (medicalId.data.role === "view" ? (
          <ErrorAlert message="You can view this Medical ID, but not change it. Ask the owner for “Can manage”." />
        ) : (
          <>
            <h1 className="text-3xl font-bold">
              Medical ID{" "}
              <span className="text-lg font-normal text-muted">
                · {medicalId.data.personName}
              </span>
            </h1>
            <p className="-mt-3 text-sm text-muted">
              Everything is optional. Allergies and emergency contacts matter
              most.
            </p>
            <MedicalIdForm medicalId={medicalId.data} backTo={back} />
          </>
        ))}
    </main>
  );
}
