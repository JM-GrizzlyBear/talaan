import { useNavigate } from "react-router";
import { useRecordAccounts, useRecordList } from "@talaan/client";
import { PersonPicker } from "../../components/people/PersonPicker";
import { usePersonParams } from "../../components/medical/usePersonParams";
import { ShareForm } from "../../components/shares/form/ShareForm";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

// /shares/new?owner=…&person=…&record=…&labs=1&medical=1
// (other pages start it with something already chosen)
export function ShareNewPage() {
  const accounts = useRecordAccounts();
  const mine = (accounts.data ?? []).filter(
    (a) => a.role === "owner" || a.role === "manage",
  );
  const { account, person, query, params, setParams } = usePersonParams(mine);
  const records = useRecordList({
    ownerId: person?.ownerId,
    profileId: person?.profileId,
  });
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={`/shares?${query}`}>Links for doctors</BackLink>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">New link for a doctor</h1>
        <p className="text-muted">
          They open it without an account and see only what you choose here.
        </p>
      </div>
      {accounts.isPending && <Loading />}
      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {account && person && (
        <>
          <div className="sm:max-w-sm">
            <PersonPicker
              label="Whose records"
              accounts={mine}
              ownerId={account.ownerId}
              profileId={person.profileId}
              onChange={(owner, profile) =>
                setParams({ owner, person: profile }, { replace: true })
              }
            />
          </div>
          {records.isPending && <Loading />}
          {records.isError && (
            <ErrorAlert message={errorMessage(records.error)} />
          )}
          {records.data && (
            <ShareForm
              // A new person starts the choices over
              key={`${person.ownerId}|${person.profileId}`}
              ownerId={person.ownerId}
              profileId={person.profileId}
              records={records.data.records}
              initial={{
                medicalId: params.get("medical") === "1",
                labs: params.get("labs") === "1",
                recordIds: params
                  .getAll("record")
                  .filter((id) =>
                    records.data.records.some((r) => r.id === id),
                  ),
              }}
              onCreated={(link, pin) =>
                void navigate(`/shares/${link.id}`, {
                  state: { pin, made: true },
                })
              }
            />
          )}
        </>
      )}
    </main>
  );
}
