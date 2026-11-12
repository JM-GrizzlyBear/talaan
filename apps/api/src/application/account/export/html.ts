import {
  ACCESS_LABELS,
  BLOOD_TYPES,
  formatLabelCode,
  fullName,
  labFlag,
  PLACE_KIND_LABELS,
  RECORD_TYPE_LABELS,
  REMINDER_KIND_LABELS,
} from "@talaan/shared";
import type { ExportData } from "./ExportData.js";
import type { ExportPaths } from "./paths.js";

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const dateText = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

const dateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);

// A link inside the ZIP (spaces and # kept working)
const href = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

const facts = (rows: [string, string | null | undefined][]) => {
  const shown = rows.filter(([, v]) => v);
  if (shown.length === 0) return "";
  return `<dl>${shown.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
};

const STYLE = `
  body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#13232b;max-width:900px;margin:0 auto;padding:24px 16px;background:#fff}
  h1{font-size:28px;margin:0 0 4px} h2{font-size:22px;margin:40px 0 8px;border-bottom:2px solid #127a6a;padding-bottom:4px}
  h3{font-size:18px;margin:24px 0 8px} h4{font-size:16px;margin:0 0 4px}
  .muted{color:#5b6b70} .card{border:1px solid #dfe5e2;border-radius:10px;padding:12px 16px;margin:10px 0;break-inside:avoid}
  dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 16px;margin:8px 0} dt{color:#5b6b70} dd{margin:0}
  table{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px} th,td{border:1px solid #dfe5e2;padding:4px 8px;text-align:left;vertical-align:top}
  th{background:#f3f6f5} .low{color:#1d4ed8;font-weight:600} .high{color:#b91c1c;font-weight:600}
  .bad{color:#b91c1c;font-weight:600} nav a{margin-right:12px} ul{padding-left:20px}
  .pre{white-space:pre-line}
  @media print{nav{display:none} h2{break-before:page}}
`;

function recordHtml(
  r: ExportData["records"][number],
  paths: ExportPaths,
): string {
  const rec = r.record;
  const d = rec.details as Record<string, unknown>;
  let details = "";
  if (rec.type === "lab" && rec.details.results.length > 0) {
    details = `<table><tr><th>Test</th><th>Result</th><th>Normal</th></tr>${rec.details.results
      .map((x) => {
        const flag = labFlag(x);
        const range =
          x.rangeLow !== null || x.rangeHigh !== null
            ? `${x.rangeLow ?? ""}–${x.rangeHigh ?? ""}`
            : "";
        return `<tr><td>${esc(x.name)}</td><td class="${flag === "low" ? "low" : flag === "high" ? "high" : ""}">${esc(`${x.value} ${x.unit}`.trim())}${flag === "low" ? " ↓" : flag === "high" ? " ↑" : ""}</td><td>${esc(range)}</td></tr>`;
      })
      .join("")}</table>`;
  } else if (rec.type === "prescription") {
    details = `<ul>${rec.details.medicines
      .map(
        (m) =>
          `<li>${esc([m.name, m.dose, m.frequency].filter(Boolean).join(", "))}</li>`,
      )
      .join("")}</ul>`;
  } else {
    details = facts([
      ["Body part", d.bodyPart as string],
      ["Reading", d.reading as string],
      ["Vaccine", d.vaccine as string],
      ["Dose", d.dose as string],
      ["HMO", d.hmo as string],
      ["LOA number", d.loaNumber as string],
    ]);
  }
  const files = r.files
    .map((f) => {
      const path = paths.forFile.get(f.id);
      return path
        ? `<li><a href="${href(path)}">${esc(f.originalName)}</a></li>`
        : "";
    })
    .join("");
  return `<div class="card">
<h4>${esc(rec.title)}</h4>
<div class="muted">${esc(RECORD_TYPE_LABELS[rec.type])} · ${esc(dateText(rec.recordDate))}${r.inTrash ? " · In the Trash" : ""}</div>
${facts([
  ["Doctor", rec.doctor],
  ["Clinic or hospital", rec.facility],
  ["Kept in", r.place],
])}
${details}
${rec.notes ? `<p class="pre">${esc(rec.notes)}</p>` : ""}
${files ? `<p class="muted">Photos and PDFs:</p><ul>${files}</ul>` : ""}
</div>`;
}

function medicalHtml(m: ExportData["medicalIds"][number]["medicalId"]) {
  const f = m.fields;
  const blood = BLOOD_TYPES.includes(f.bloodType as never) ? f.bloodType : "";
  return `<div class="card">
<h4>Medical ID</h4>
${facts([
  ["Blood type", blood && blood !== "unknown" ? blood : ""],
  ["Birth date", f.birthDate ? dateText(f.birthDate) : ""],
  ["Height", f.heightCm ? `${f.heightCm} cm` : ""],
  ["Weight", f.weightKg ? `${f.weightKg} kg` : ""],
  [
    "Allergies",
    f.noKnownAllergies
      ? "No known allergies"
      : f.allergies
          .map((a) =>
            [a.name, a.severity, a.reaction].filter(Boolean).join(", "),
          )
          .join("; "),
  ],
  ["Conditions", f.conditions.map((c) => c.name).join("; ")],
  [
    "Medicines",
    f.medicines
      .map((x) => [x.name, x.dose].filter(Boolean).join(" "))
      .join("; "),
  ],
  ["Implants and devices", f.devices.map((x) => x.name).join("; ")],
  [
    "Emergency contacts",
    f.contacts
      .map(
        (c) =>
          `${c.name}${c.relationship ? ` (${c.relationship})` : ""} ${c.phone}`,
      )
      .join("; "),
  ],
  [
    "Doctor",
    [f.doctor.name, f.doctor.clinic, f.doctor.phone].filter(Boolean).join(", "),
  ],
  ["PhilHealth ID", f.philhealth],
  ["Home address", f.address],
  [
    "Organ donor",
    f.organDonor === "yes" ? "Yes" : f.organDonor === "no" ? "No" : "",
  ],
  ["Notes for doctors", f.notes],
])}
</div>`;
}

// One page that opens in any browser, with links to the photos and PDFs
export function exportHtml(data: ExportData, paths: ExportPaths) {
  const { household } = data;
  const people = [
    { id: null as string | null, name: household.ownerName },
    ...household.profiles.map((p) => ({ id: p.id, name: fullName(p) })),
  ];
  const sections = people.map((person, i) => {
    const records = data.records
      .filter((r) => r.record.profileId === person.id)
      .sort((a, b) => b.record.recordDate.localeCompare(a.record.recordDate));
    const medical = data.medicalIds.find(
      (m) => m.medicalId.profileId === person.id,
    );
    return `<h2 id="person-${i}">${esc(person.name)}</h2>
${medical ? medicalHtml(medical.medicalId) : ""}
<h3>Records (${records.length})</h3>
${records.length ? records.map((r) => recordHtml(r, paths)).join("\n") : '<p class="muted">No records.</p>'}`;
  });

  const places = data.places.length
    ? `<table><tr><th>Place</th><th>Kind</th><th>Inside</th><th>QR code</th><th>Note</th></tr>${data.places
        .map(({ place: p, inside }) => {
          const photo = paths.forPlace.get(p.id);
          return `<tr><td>${photo ? `<a href="${href(photo)}">${esc(p.name)}</a>` : esc(p.name)}</td><td>${esc(PLACE_KIND_LABELS[p.kind])}</td><td>${esc(inside)}</td><td>${esc(formatLabelCode(p.code))}</td><td>${esc(p.note)}</td></tr>`;
        })
        .join("")}</table>`
    : '<p class="muted">No places.</p>';

  const reminders = data.reminders.length
    ? `<table><tr><th>Reminder</th><th>For</th><th>Kind</th><th>Dose</th><th>Times</th></tr>${data.reminders
        .map(
          ({ reminder: r, person }) =>
            `<tr><td>${esc(r.title)}${r.paused ? ' <span class="muted">(paused)</span>' : ""}</td><td>${esc(person)}</td><td>${esc(REMINDER_KIND_LABELS[r.kind])}</td><td>${esc(r.dose)}</td><td>${esc(r.schedule.times.join(", "))}</td></tr>`,
        )
        .join("")}</table>`
    : '<p class="muted">No reminders.</p>';

  const family = `<h3>You share with</h3>${
    data.members.length
      ? `<ul>${data.members.map((m) => `<li>${esc(fullName(m.person))} (${esc(m.relationship)}), ${esc(ACCESS_LABELS[m.access].name)}</li>`).join("")}</ul>`
      : '<p class="muted">Nobody.</p>'
  }<h3>Shared with you</h3>${
    data.sharedWithYou.length
      ? `<ul>${data.sharedWithYou.map((m) => `<li>${esc(fullName(m.person))}'s records, ${esc(ACCESS_LABELS[m.access].name)}</li>`).join("")}</ul><p class="muted">Their records are theirs, so they aren't in this download.</p>`
      : '<p class="muted">Nobody.</p>'
  }`;

  const links = data.shares.length
    ? `<ul>${data.shares
        .map(
          ({ link: s, person }) =>
            `<li>For ${esc(s.recipient)}, ${esc(person)}'s records, until ${esc(dateTime(s.expiresAt))}${s.stoppedAt ? " (stopped)" : ""}; opened ${s.views.length} ${s.views.length === 1 ? "time" : "times"}</li>`,
        )
        .join("")}</ul>`
    : '<p class="muted">No doctor links.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Talaan: ${esc(household.ownerName)}</title>
<style>${STYLE}</style>
</head>
<body>
<h1>${esc(household.ownerName)}'s health records</h1>
<p class="muted">Downloaded from Talaan on ${esc(dateTime(data.madeAt))} (Philippine time). Keep this file safe: it has private health information.</p>
<nav>${people.map((p, i) => `<a href="#person-${i}">${esc(p.name)}</a>`).join("")}<a href="#places">Places</a><a href="#reminders">Reminders</a><a href="#family">Family sharing</a><a href="#links">Doctor links</a></nav>
${sections.join("\n")}
<h2 id="places">Places</h2>
${places}
<h2 id="reminders">Reminders</h2>
${reminders}
<h2 id="family">Family sharing</h2>
${family}
<h2 id="links">Doctor links</h2>
${links}
<p class="muted">Also in this download: records.csv, lab-results.csv and reminders.csv (open in Excel or Google Sheets), and talaan-data.json (everything, for moving to another app).</p>
</body>
</html>`;
}
