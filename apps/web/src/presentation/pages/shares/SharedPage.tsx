import { isEmptyMedicalId, type SharedPageInfo } from "@talaan/shared";
import { CalendarClock, Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useOpenShared, useShared, shortDateTime } from "@talaan/client";
import { MedicalIdView } from "../../components/medical/MedicalIdView";
import { PinGate } from "../../components/shares/doctor/PinGate";
import { SharedLabs } from "../../components/shares/doctor/SharedLabs";
import { SharedRecordCard } from "../../components/shares/doctor/SharedRecordCard";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { buttonSecondary } from "../../components/ui/styles";
import { useNoIndex } from "../../components/ui/useNoIndex";
import { errorMessage } from "../../format/errorMessage";

// /s/:token — what a doctor opens, without signing in: a PIN first when
// there is one, then only what the family chose
export function SharedPage() {
  const { token = "" } = useParams();
  const shared = useShared(token);
  const open = useOpenShared(token);
  useNoIndex();

  // No PIN: open it straight away (once)
  const gate = shared.data?.gate;
  const asked = useRef(false);
  useEffect(() => {
    if (gate && !gate.needsPin && !asked.current) {
      asked.current = true;
      open.mutate("");
    }
  }, [gate, open]);

  if (shared.isPending) {
    return <Loading className="p-8 text-center text-muted" />;
  }
  if (shared.isError) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-12">
        <h1 className="text-2xl font-bold">This link doesn't open anymore</h1>
        <p className="text-muted">{errorMessage(shared.error)}</p>
      </main>
    );
  }
  if (shared.data.page)
    return <SharedView token={token} page={shared.data.page} />;
  if (gate?.needsPin) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12">
        <PinGate
          onSubmit={(pin) => open.mutate(pin)}
          pending={open.isPending}
          error={open.error}
          waitUntil={gate.waitUntil}
        />
      </main>
    );
  }
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-12">
      {open.isError ? (
        <ErrorAlert message={errorMessage(open.error)} />
      ) : (
        <Loading className="text-center text-muted" />
      )}
    </main>
  );
}

function SharedView({ token, page }: { token: string; page: SharedPageInfo }) {
  const inPage = new Set(page.records.map((r) => r.id));
  const parts = [
    page.medicalId && { id: "medical-id", label: "Medical ID" },
    page.labs && { id: "lab-results", label: "Lab results" },
    page.records.length > 0 && {
      id: "records",
      label: `Records (${page.records.length})`,
    },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 print:py-0">
      {page.preview && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          This is what {page.recipient} sees. You're signed in to these records,
          so opening it here isn't counted.
        </p>
      )}
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-brand">
          Shared with {page.recipient}
          {page.sharedByName ? ` by ${page.sharedByName}` : ""}
        </p>
        <h1 className="text-3xl font-bold break-words">{page.personName}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarClock aria-hidden="true" className="size-4" />
          Open until {shortDateTime(page.expiresAt)}
        </p>
        {page.note && (
          <blockquote className="rounded-lg border-l-4 border-brand bg-white px-4 py-3 whitespace-pre-line">
            {page.note}
          </blockquote>
        )}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {parts.length > 1 && (
            <nav aria-label="On this page" className="flex flex-wrap gap-2">
              {parts.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-deep hover:underline"
                >
                  {p.label}
                </a>
              ))}
            </nav>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className={`${buttonSecondary} ml-auto`}
          >
            <Printer aria-hidden="true" className="size-4" />
            Print
          </button>
        </div>
      </header>

      {page.medicalId && (
        <section
          id="medical-id"
          aria-labelledby="medical-id-heading"
          className="flex scroll-mt-4 flex-col gap-3"
        >
          <h2 id="medical-id-heading" className="text-2xl font-bold">
            Medical ID
          </h2>
          {isEmptyMedicalId(page.medicalId) ? (
            <p className="text-muted">Not filled in yet.</p>
          ) : (
            <MedicalIdView fields={page.medicalId} />
          )}
        </section>
      )}

      {page.labs && (
        <section
          id="lab-results"
          aria-labelledby="lab-results-heading"
          className="flex scroll-mt-4 flex-col gap-3 break-before-page"
        >
          <h2 id="lab-results-heading" className="text-2xl font-bold">
            Lab results
          </h2>
          <SharedLabs
            records={page.labs}
            recordLink={(id) => (inPage.has(id) ? `#record-${id}` : null)}
          />
        </section>
      )}

      {page.records.length > 0 && (
        <section
          id="records"
          aria-labelledby="records-heading"
          className="flex scroll-mt-4 flex-col gap-4"
        >
          <h2 id="records-heading" className="text-2xl font-bold">
            Records
          </h2>
          {page.records.map((record) => (
            <SharedRecordCard key={record.id} token={token} record={record} />
          ))}
        </section>
      )}

      <footer className="border-t border-edge pt-4 text-xs text-muted">
        From Talaan, a family's health records. Shared for {page.recipient}{" "}
        until {shortDateTime(page.expiresAt)}; please don't pass the link on.
      </footer>
    </main>
  );
}
