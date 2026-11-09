import {
  ageOn,
  allergiesBySeverity,
  type MedicalIdFields,
  SEVERITY_LABELS,
  telLink,
  todayText,
} from "@talaan/shared";
import { Phone, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { shortDate } from "../../format/dates";

const SEX = { female: "Female", male: "Male", "": "" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-edge bg-white p-4">
      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const Missing = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted">{children}</p>
);

// A Medical ID the way someone helping in an emergency needs it: allergies
// first, then blood type, conditions, medicines, then who to call
export function MedicalIdView({
  fields,
  print = false,
}: {
  fields: MedicalIdFields;
  // Printed: phone numbers as plain text
  print?: boolean;
}) {
  const age = ageOn(fields.birthDate, todayText(new Date()));
  const allergies = allergiesBySeverity(fields.allergies);
  const facts = [
    fields.bloodType && [
      "Blood type",
      fields.bloodType === "unknown" ? "Don't know" : fields.bloodType,
    ],
    fields.birthDate && [
      "Born",
      `${shortDate(fields.birthDate)}${age !== null ? ` (${age} years old)` : ""}`,
    ],
    fields.sex && ["Sex", SEX[fields.sex]],
    fields.heightCm !== null && ["Height", `${fields.heightCm} cm`],
    fields.weightKg !== null && ["Weight", `${fields.weightKg} kg`],
    fields.organDonor && [
      "Organ donor",
      fields.organDonor === "yes" ? "Yes" : "No",
    ],
    fields.philhealth && ["PhilHealth ID", fields.philhealth],
    fields.address && ["Address", fields.address],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="flex flex-col gap-4">
      <Block title="Allergies">
        {allergies.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {allergies.map((a, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-baseline gap-x-2 rounded-lg px-3 py-2 ${
                  a.severity === "life-threatening" || a.severity === "severe"
                    ? "bg-danger-soft text-danger"
                    : "bg-warn-soft text-warn"
                }`}
              >
                {(a.severity === "life-threatening" ||
                  a.severity === "severe") && (
                  <TriangleAlert
                    aria-hidden="true"
                    className="size-4 self-center"
                  />
                )}
                <span className="text-lg font-bold">{a.name}</span>
                <span className="text-sm font-semibold">
                  {SEVERITY_LABELS[a.severity]}
                </span>
                {a.reaction && <span className="text-sm">· {a.reaction}</span>}
              </li>
            ))}
          </ul>
        ) : fields.noKnownAllergies ? (
          <p className="text-lg font-semibold">No known allergies</p>
        ) : (
          <Missing>Not filled in. That doesn't mean there are none.</Missing>
        )}
      </Block>

      {facts.length > 0 && (
        <Block title="About">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd
                  className={`font-semibold ${label === "Blood type" ? "text-2xl" : "text-lg"}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      <Block title="Conditions">
        {fields.conditions.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {fields.conditions.map((c, i) => (
              <li key={i} className="text-lg">
                <span className="font-semibold">{c.name}</span>
                {c.since && (
                  <span className="text-sm text-muted"> · since {c.since}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Missing>None listed.</Missing>
        )}
      </Block>

      <Block title="Medicines taken regularly">
        {fields.medicines.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {fields.medicines.map((m, i) => (
              <li key={i} className="text-lg">
                <span className="font-semibold">{m.name}</span>
                {m.dose && (
                  <span className="text-sm text-muted"> · {m.dose}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Missing>None listed.</Missing>
        )}
      </Block>

      {fields.devices.length > 0 && (
        <Block title="Implants and devices">
          <ul className="flex flex-col gap-1">
            {fields.devices.map((d, i) => (
              <li key={i} className="text-lg">
                <span className="font-semibold">{d.name}</span>
                {d.note && (
                  <span className="text-sm text-muted"> · {d.note}</span>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Emergency contacts">
        {fields.contacts.length > 0 ? (
          <ContactList contacts={fields.contacts} print={print} />
        ) : (
          <Missing>None yet. Add at least one.</Missing>
        )}
      </Block>

      {(fields.doctor.name || fields.doctor.phone) && (
        <Block title="Doctor">
          <p className="text-lg font-semibold">
            {fields.doctor.name}
            {fields.doctor.specialty && (
              <span className="text-sm font-normal text-muted">
                {" "}
                · {fields.doctor.specialty}
              </span>
            )}
          </p>
          {fields.doctor.clinic && <p>{fields.doctor.clinic}</p>}
          {fields.doctor.phone &&
            (print ? (
              <p className="font-semibold">{fields.doctor.phone}</p>
            ) : (
              <CallButton
                phone={fields.doctor.phone}
                label={`Call ${fields.doctor.name || "the doctor"}`}
              />
            ))}
        </Block>
      )}

      {fields.notes && (
        <Block title="Notes for doctors">
          <p className="whitespace-pre-wrap">{fields.notes}</p>
        </Block>
      )}
    </div>
  );
}

export function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={telLink(phone)}
      aria-label={`${label}: ${phone}`}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg bg-brand px-4 font-semibold text-white hover:bg-deep"
    >
      <Phone aria-hidden="true" className="size-4" />
      {phone}
    </a>
  );
}

export function ContactList({
  contacts,
  print = false,
}: {
  contacts: MedicalIdFields["contacts"];
  print?: boolean;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {contacts.map((c, i) => (
        <li
          key={i}
          className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="text-lg font-semibold">{c.name}</span>
            {c.relationship && (
              <span className="text-sm text-muted"> · {c.relationship}</span>
            )}
          </span>
          {print ? (
            <span className="text-lg font-semibold">{c.phone}</span>
          ) : (
            <CallButton phone={c.phone} label={`Call ${c.name}`} />
          )}
        </li>
      ))}
    </ol>
  );
}
