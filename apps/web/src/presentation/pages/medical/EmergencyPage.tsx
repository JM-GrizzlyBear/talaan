import { allergiesBySeverity, SEVERITY_LABELS } from "@talaan/shared";
import { TriangleAlert } from "lucide-react";
import { useParams } from "react-router";
import { useEmergency } from "@talaan/client";
import { ContactList } from "../../components/medical/MedicalIdView";
import { Loading } from "../../components/ui/Loading";
import { useNoIndex } from "../../components/ui/useNoIndex";

// What the emergency QR opens, for anyone: no sign-in. Shows the contacts
// and only what the person chose to share.
export function EmergencyPage() {
  const { token = "" } = useParams();
  const emergency = useEmergency(token);

  useNoIndex();

  if (emergency.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (emergency.isError) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-12">
        <h1 className="text-2xl font-bold">This emergency code isn't on</h1>
        <p className="text-muted">
          The person may have turned it off or made a new one. In an emergency,
          call 911.
        </p>
      </main>
    );
  }
  const e = emergency.data;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
      <header className="rounded-xl bg-red-700 p-4 text-white">
        <p className="text-sm font-bold tracking-wide uppercase">✚ Emergency</p>
        <h1 className="text-2xl font-bold">{e.name}</h1>
        {e.address && <p className="mt-1 text-sm">Lives at {e.address}</p>}
        <p className="mt-2 text-sm">
          Please call one of these people. In an emergency, also call 911.
        </p>
      </header>
      {e.contacts.length > 0 ? (
        <ContactList contacts={e.contacts} />
      ) : (
        <p className="text-muted">No contacts listed.</p>
      )}
      {e.bloodType && e.bloodType !== "unknown" && (
        <p className="text-lg">
          Blood type: <span className="text-2xl font-bold">{e.bloodType}</span>
        </p>
      )}
      {e.allergies && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
            Allergies
          </h2>
          {e.allergies.length ? (
            <ul className="flex flex-col gap-1.5">
              {allergiesBySeverity(e.allergies).map((a, i) => {
                const serious =
                  a.severity === "life-threatening" || a.severity === "severe";
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${serious ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}
                  >
                    {serious && (
                      <TriangleAlert aria-hidden="true" className="size-4" />
                    )}
                    <span className="font-bold">{a.name}</span>
                    <span className="text-sm">
                      {SEVERITY_LABELS[a.severity]}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{e.noKnownAllergies ? "No known allergies" : "Not listed"}</p>
          )}
        </section>
      )}
      {e.conditions && e.conditions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
            Conditions
          </h2>
          <p className="text-lg">
            {e.conditions.map((c) => c.name).join(", ")}
          </p>
        </section>
      )}
      {e.medicines && e.medicines.length > 0 && (
        <section>
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
            Medicines
          </h2>
          <ul className="text-lg">
            {e.medicines.map((m, i) => (
              <li key={i}>
                {m.name}
                {m.dose && (
                  <span className="text-sm text-muted"> · {m.dose}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="border-t border-edge pt-3 text-xs text-muted">
        From Talaan. {e.name.split(" ")[0]} chose what this page shows.
      </p>
    </main>
  );
}
