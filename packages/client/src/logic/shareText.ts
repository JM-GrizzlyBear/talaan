import type { ShareLinkInfo } from "@talaan/shared";

// "Medical ID, lab results, 3 records"
export function sharedThings(
  link: Pick<ShareLinkInfo, "medicalId" | "labs" | "records">,
) {
  const n = link.records.length;
  return [
    link.medicalId && "Medical ID",
    link.labs && "lab results",
    n > 0 && `${n} ${n === 1 ? "record" : "records"}`,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/^./, (c) => c.toUpperCase());
}

// "Opened 2 times", "Not opened yet"
export function openedText(link: Pick<ShareLinkInfo, "views" | "maxViews">) {
  const n = link.views.length;
  const of = link.maxViews !== null ? ` of ${link.maxViews}` : "";
  if (n === 0)
    return `Not opened yet${link.maxViews !== null ? ` (up to ${link.maxViews} devices)` : ""}`;
  return `Opened on ${n}${of} ${n === 1 && !of ? "device" : "devices"}`;
}
