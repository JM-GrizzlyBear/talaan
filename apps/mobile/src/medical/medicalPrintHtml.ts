import { shortDate } from "@talaan/client";
import {
  ageOn,
  allergiesBySeverity,
  type MedicalIdInfo,
  SEVERITY_LABELS,
  todayText,
} from "@talaan/shared";
import qrcode from "qrcode-generator";
import { escapeHtml as e, pageHtml, type PageSize } from "../print/printing";
import { emergencyUrl } from "./EmergencyQrPanel";

function qrSvg(text: string, mm: number) {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (code.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" style="width:${mm}mm;height:${mm}mm" xmlns="http://www.w3.org/2000/svg"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

const SEX = { female: "Female", male: "Male", "": "" };

// Credit-card size (85.6 × 54 mm), front and back side by side: cut, fold,
// glue or laminate (the website's wallet card)
export function walletCardHtml(
  m: MedicalIdInfo,
  philhealth: boolean,
  page: PageSize,
) {
  const f = m.fields;
  const age = ageOn(f.birthDate, todayText(new Date()));
  const allergies = allergiesBySeverity(f.allergies);
  const token = m.emergency.token;
  const face = (inner: string) =>
    `<div style="width:85.6mm;height:54mm;padding:3mm;overflow:hidden;position:relative;font-size:7pt;line-height:1.25">${inner}</div>`;
  const front = face(`
    <div style="background:#b91c1c;color:#fff;font-weight:800;font-size:8pt;padding:1mm 2mm;margin:-3mm -3mm 2mm">✚ MEDICAL ID</div>
    <div style="font-weight:800;font-size:10pt">${e(m.personName)}</div>
    <div>${[f.birthDate && `Born ${e(f.birthDate)}${age !== null ? ` (${age})` : ""}`, f.bloodType && f.bloodType !== "unknown" && `Blood type ${e(f.bloodType)}`].filter(Boolean).join(" · ")}</div>
    <div style="font-weight:700;margin-top:1.5mm;text-transform:uppercase;font-size:6pt;color:#555">Allergies</div>
    <div>${
      allergies.length
        ? allergies
            .map((a) => {
              const bad =
                a.severity === "life-threatening" || a.severity === "severe";
              return `<span style="${bad ? "font-weight:700;color:#b91c1c" : ""}">${e(a.name)} (${SEVERITY_LABELS[a.severity].toLowerCase()})</span>`;
            })
            .join(", ")
        : f.noKnownAllergies
          ? "No known allergies"
          : "Not listed"
    }</div>
    ${f.conditions.length ? `<div style="font-weight:700;margin-top:1.5mm;text-transform:uppercase;font-size:6pt;color:#555">Conditions</div><div>${e(f.conditions.map((c) => c.name).join(", "))}</div>` : ""}`);
  const back = face(`
    <div style="font-weight:800;font-size:8pt">In an emergency, call</div>
    <div>${
      f.contacts
        .slice(0, 3)
        .map(
          (c) =>
            `<div><b>${e(c.name)}</b>${c.relationship ? ` (${e(c.relationship)})` : ""}: ${e(c.phone)}</div>`,
        )
        .join("") || "Not listed"
    }</div>
    ${f.doctor.name ? `<div style="margin-top:1mm"><b>Doctor:</b> ${e(f.doctor.name)}${f.doctor.phone ? `, ${e(f.doctor.phone)}` : ""}</div>` : ""}
    ${f.medicines.length ? `<div style="margin-top:1mm;margin-right:${token ? "20mm" : "0"}"><b>Medicines:</b> ${e(f.medicines.map((x) => x.name).join(", "))}</div>` : ""}
    ${philhealth && f.philhealth ? `<div style="margin-top:1mm"><b>PhilHealth:</b> ${e(f.philhealth)}</div>` : ""}
    ${token ? `<div style="position:absolute;right:3mm;bottom:3mm;text-align:center;font-size:5.5pt">${qrSvg(emergencyUrl(token), 17)}<div>Scan for contacts</div></div>` : ""}`);
  return pageHtml(
    `<div style="display:flex;width:171.2mm;border:1px dashed #999">${front}<div style="border-left:1px dashed #999"></div>${back}</div>
     <p style="font-size:9pt;color:#666;margin-top:4mm">Cut along the dashed line, fold in the middle, and glue or laminate it. Print at “Actual size” (100%).</p>`,
    page,
  );
}

// Everything on the Medical ID, for a doctor visit or the hospital
export function summaryHtml(
  m: MedicalIdInfo,
  page: PageSize,
  columns: boolean,
) {
  const f = m.fields;
  const age = ageOn(f.birthDate, todayText(new Date()));
  const printed = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const block = (title: string, body: string) =>
    `<section style="break-inside:avoid;margin-bottom:4mm"><h2 style="font-size:10pt;text-transform:uppercase;color:#555;margin:0 0 1.5mm">${title}</h2>${body}</section>`;
  const list = (items: string[], none: string) =>
    items.length
      ? `<ul style="margin:0;padding-left:5mm">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`
      : `<p class="muted"><i>${none}</i></p>`;
  const facts = [
    f.bloodType && [
      "Blood type",
      f.bloodType === "unknown" ? "Don't know" : f.bloodType,
    ],
    f.birthDate && [
      "Born",
      `${shortDate(f.birthDate)}${age !== null ? ` (${age} years old)` : ""}`,
    ],
    f.sex && ["Sex", SEX[f.sex]],
    f.heightCm !== null && ["Height", `${f.heightCm} cm`],
    f.weightKg !== null && ["Weight", `${f.weightKg} kg`],
    f.organDonor && ["Organ donor", f.organDonor === "yes" ? "Yes" : "No"],
    f.philhealth && ["PhilHealth ID", f.philhealth],
    f.address && ["Address", f.address],
  ].filter(Boolean) as [string, string][];
  const body = [
    block(
      "Allergies",
      allergiesBySeverity(f.allergies).length
        ? list(
            allergiesBySeverity(f.allergies).map((a) => {
              const bad =
                a.severity === "life-threatening" || a.severity === "severe";
              return `<b style="${bad ? "color:#b91c1c" : ""}">${e(a.name)}</b> · ${SEVERITY_LABELS[a.severity]}${a.reaction ? ` · ${e(a.reaction)}` : ""}`;
            }),
            "",
          )
        : f.noKnownAllergies
          ? "<p><b>No known allergies</b></p>"
          : `<p class="muted"><i>Not filled in. That doesn't mean there are none.</i></p>`,
    ),
    facts.length
      ? block(
          "About",
          `<table>${facts.map(([k, v]) => `<tr><th style="width:35%">${k}</th><td>${e(v)}</td></tr>`).join("")}</table>`,
        )
      : "",
    block(
      "Conditions",
      list(
        f.conditions.map(
          (c) =>
            `<b>${e(c.name)}</b>${c.since ? ` · since ${e(c.since)}` : ""}`,
        ),
        "None listed.",
      ),
    ),
    block(
      "Medicines taken regularly",
      list(
        f.medicines.map(
          (x) => `<b>${e(x.name)}</b>${x.dose ? ` · ${e(x.dose)}` : ""}`,
        ),
        "None listed.",
      ),
    ),
    f.devices.length
      ? block(
          "Implants and devices",
          list(
            f.devices.map(
              (d) => `<b>${e(d.name)}</b>${d.note ? ` · ${e(d.note)}` : ""}`,
            ),
            "",
          ),
        )
      : "",
    block(
      "Emergency contacts",
      f.contacts.length
        ? `<ol style="margin:0;padding-left:5mm">${f.contacts.map((c) => `<li><b>${e(c.name)}</b>${c.relationship ? ` · ${e(c.relationship)}` : ""} · ${e(c.phone)}</li>`).join("")}</ol>`
        : `<p class="muted"><i>None yet.</i></p>`,
    ),
    f.doctor.name || f.doctor.phone
      ? block(
          "Doctor",
          `<p><b>${e(f.doctor.name)}</b>${f.doctor.specialty ? ` · ${e(f.doctor.specialty)}` : ""}${f.doctor.clinic ? `<br>${e(f.doctor.clinic)}` : ""}${f.doctor.phone ? `<br>${e(f.doctor.phone)}` : ""}</p>`,
        )
      : "",
    f.notes ? block("Notes for doctors", `<p>${e(f.notes)}</p>`) : "",
  ].join("");
  return pageHtml(
    `<div style="display:flex;justify-content:space-between;border-bottom:2px solid #b91c1c;padding-bottom:3mm;margin-bottom:4mm">
       <h1>Medical ID: ${e(m.personName)}</h1><div class="muted" style="text-align:right">Printed ${printed}<br>from Talaan</div></div>
     <div style="${columns ? "columns:2;column-gap:6mm" : ""}">${body}</div>`,
    page,
  );
}
