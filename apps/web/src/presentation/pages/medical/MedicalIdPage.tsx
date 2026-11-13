import {
  isEmptyMedicalId,
  type MedicalIdInfo,
  monthsSince,
} from "@talaan/shared";
import { CreditCard, FileText, Link2, Pencil, Smartphone } from "lucide-react";
import { Link } from "react-router";
import {
  useMarkChecked,
  useMedicalId,
  useRecordAccounts,
  shortDate,
} from "@talaan/client";
import { EmergencyQrPanel } from "../../components/medical/EmergencyQrPanel";
import { LockScreenMaker } from "../../components/medical/lockscreen/LockScreenMaker";
import { MedicalIdView } from "../../components/medical/MedicalIdView";
import { usePersonParams } from "../../components/medical/usePersonParams";
import { PersonPicker } from "../../components/people/PersonPicker";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { Notice } from "../../components/ui/Notice";
import { buttonPrimary, buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

// Ask again after this long without a check
const CHECK_AFTER_MONTHS = 6;

// /medical-id?owner=…&person=self|<profile>
export function MedicalIdPage() {
  const accounts = useRecordAccounts();
  const { account, person, query, setParams } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Medical ID</h1>
        <p className="text-muted">
          What someone helping in an emergency needs to know, and who to call.
        </p>
      </div>
      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {account && person && (
        <div className="sm:max-w-sm">
          <PersonPicker
            label="Whose Medical ID"
            accounts={accounts.data ?? []}
            ownerId={person.ownerId}
            profileId={person.profileId}
            onChange={(owner, profile) =>
              setParams({ owner, person: profile }, { replace: true })
            }
          />
        </div>
      )}
      {(accounts.isPending || medicalId.isPending) && <Loading />}
      {medicalId.isError && (
        <ErrorAlert message={errorMessage(medicalId.error)} />
      )}
      {medicalId.data && (
        <MedicalIdBody medicalId={medicalId.data} query={query} />
      )}
    </main>
  );
}

function MedicalIdBody({
  medicalId,
  query,
}: {
  medicalId: MedicalIdInfo;
  query: string;
}) {
  const canChange = medicalId.role === "owner" || medicalId.role === "manage";
  const person = {
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  };
  const check = useMarkChecked(person);
  const empty = isEmptyMedicalId(medicalId.fields);
  const stale =
    medicalId.checkedAt !== null &&
    monthsSince(medicalId.checkedAt, new Date()) >= CHECK_AFTER_MONTHS;

  if (empty) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-white p-6">
          <p className="font-semibold">
            {medicalId.personName}'s Medical ID is empty.
          </p>
          <p className="text-sm text-muted">
            Start with allergies and emergency contacts: they matter most.
            Everything else can come later.
          </p>
          {canChange && (
            <Link to={`/medical-id/edit?${query}`} className={buttonPrimary}>
              Fill it in
            </Link>
          )}
        </div>
        {canChange && <EmergencyQrPanel medicalId={medicalId} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{medicalId.personName}</h2>
        <div className="flex flex-wrap gap-2">
          {canChange && (
            <Link to={`/medical-id/edit?${query}`} className={buttonSecondary}>
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </Link>
          )}
          <Link
            to={`/medical-id/print?${query}&what=card`}
            className={buttonSecondary}
          >
            <CreditCard aria-hidden="true" className="size-4" />
            Wallet card
          </Link>
          <Link
            to={`/medical-id/print?${query}&what=summary`}
            className={buttonSecondary}
          >
            <FileText aria-hidden="true" className="size-4" />
            One-page summary
          </Link>
          {canChange && (
            <Link
              to={`/shares/new?${query}&medical=1`}
              className={buttonSecondary}
            >
              <Link2 aria-hidden="true" className="size-4" />
              Share with a doctor
            </Link>
          )}
        </div>
      </div>

      {stale && canChange && (
        <Notice>
          <span className="flex flex-wrap items-center gap-3">
            Last checked {shortDate(medicalId.checkedAt as string)}. Is it still
            right?
            <button
              type="button"
              onClick={() => check.mutate()}
              disabled={check.isPending}
              className="cursor-pointer font-semibold text-brand underline"
            >
              Yes, still right
            </button>
            <Link
              to={`/medical-id/edit?${query}`}
              className="font-semibold text-brand underline"
            >
              Update it
            </Link>
          </span>
        </Notice>
      )}

      <MedicalIdView fields={medicalId.fields} />

      {medicalId.updatedAt && (
        <p className="text-sm text-muted">
          Last changed
          {medicalId.updatedByName
            ? ` by ${medicalId.updatedByName}`
            : ""} on {shortDate(medicalId.updatedAt)}.
        </p>
      )}

      {canChange && <EmergencyQrPanel medicalId={medicalId} />}

      <section
        aria-labelledby="lock-heading"
        className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4"
      >
        <h2
          id="lock-heading"
          className="flex items-center gap-2 text-lg font-bold"
        >
          <Smartphone aria-hidden="true" className="size-5 text-brand" />
          Lock screen picture
        </h2>
        <LockScreenMaker medicalId={medicalId} />
      </section>
    </div>
  );
}
