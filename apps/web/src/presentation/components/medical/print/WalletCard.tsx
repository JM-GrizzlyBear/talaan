import {
  ageOn,
  allergiesBySeverity,
  type MedicalIdInfo,
  SEVERITY_LABELS,
  todayText,
} from "@talaan/shared";
import { QrCode } from "../../places/QrCode";
import { emergencyUrl } from "../emergencyUrl";

// A credit card (ID-1): 85.6 × 54 mm
const CARD = { width: 85.6, height: 54 };

const Face = ({ children }: { children: React.ReactNode }) => (
  <div
    className="relative flex flex-col overflow-hidden bg-white text-black"
    style={{
      width: `${CARD.width}mm`,
      height: `${CARD.height}mm`,
      padding: "3mm",
    }}
  >
    {children}
  </div>
);

// Front and back side by side: cut around the outside, fold on the middle
// line, glue or laminate
export function WalletCard({
  medicalId,
  philhealth,
}: {
  medicalId: MedicalIdInfo;
  philhealth: boolean;
}) {
  const f = medicalId.fields;
  const age = ageOn(f.birthDate, todayText(new Date()));
  const allergies = allergiesBySeverity(f.allergies);
  const token = medicalId.emergency.token;

  return (
    <div
      className="flex outline-[0.3mm] outline-gray-500 outline-dashed"
      style={{ width: `${CARD.width * 2}mm` }}
    >
      <Face>
        <div className="-mx-[3mm] -mt-[3mm] mb-[1.5mm] bg-red-700 px-[3mm] py-[1mm] text-[3.2mm] font-bold tracking-wide text-white">
          ✚ MEDICAL ID
        </div>
        <p className="text-[3.6mm] leading-tight font-bold">
          {medicalId.personName}
        </p>
        <p className="text-[2.4mm]">
          {[
            f.birthDate &&
              `Born ${f.birthDate}${age !== null ? ` (${age})` : ""}`,
            f.bloodType &&
              f.bloodType !== "unknown" &&
              `Blood type ${f.bloodType}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-[1.2mm] text-[2.2mm] font-bold uppercase">Allergies</p>
        <p className="line-clamp-3 text-[2.6mm] leading-snug">
          {allergies.length
            ? allergies.map((a, i) => (
                <span
                  key={i}
                  className={
                    a.severity === "life-threatening" || a.severity === "severe"
                      ? "font-bold text-red-700"
                      : ""
                  }
                >
                  {i > 0 && ", "}
                  {a.name} ({SEVERITY_LABELS[a.severity].toLowerCase()})
                </span>
              ))
            : f.noKnownAllergies
              ? "No known allergies"
              : "Not listed"}
        </p>
        {f.conditions.length > 0 && (
          <>
            <p className="mt-[1mm] text-[2.2mm] font-bold uppercase">
              Conditions
            </p>
            <p className="line-clamp-2 text-[2.6mm] leading-snug">
              {f.conditions.map((c) => c.name).join(", ")}
            </p>
          </>
        )}
      </Face>
      <div
        className="border-l-[0.3mm] border-dashed border-gray-400"
        aria-hidden="true"
      />
      <Face>
        <p className="text-[2.2mm] font-bold uppercase">
          In an emergency, call
        </p>
        <ul className="text-[2.7mm] leading-snug">
          {f.contacts.slice(0, 3).map((c, i) => (
            <li key={i}>
              <span className="font-bold">{c.name}</span>
              {c.relationship && ` (${c.relationship})`}: {c.phone}
            </li>
          ))}
          {f.contacts.length === 0 && <li>Not listed</li>}
        </ul>
        {f.doctor.name && (
          <p className="mt-[1mm] text-[2.5mm] leading-snug">
            <span className="font-bold">Doctor:</span> {f.doctor.name}
            {f.doctor.phone && `, ${f.doctor.phone}`}
          </p>
        )}
        {f.medicines.length > 0 && (
          <p
            className="mt-[1mm] line-clamp-2 text-[2.4mm] leading-snug"
            style={{ marginRight: token ? "20mm" : 0 }}
          >
            <span className="font-bold">Medicines:</span>{" "}
            {f.medicines.map((m) => m.name).join(", ")}
          </p>
        )}
        {philhealth && f.philhealth && (
          <p className="mt-auto text-[2.4mm]">
            <span className="font-bold">PhilHealth:</span> {f.philhealth}
          </p>
        )}
        {token && (
          <div className="absolute right-[2.5mm] bottom-[2.5mm] flex flex-col items-center">
            <QrCode
              text={emergencyUrl(token)}
              title="Emergency QR"
              style={{ width: "17mm", height: "17mm" }}
            />
            <span className="text-[1.8mm]">Scan for contacts</span>
          </div>
        )}
      </Face>
    </div>
  );
}
