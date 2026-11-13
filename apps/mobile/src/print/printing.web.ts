// The web preview: the browser's own print window
export interface PageSize {
  width: number;
  height: number;
}

function open(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export async function printPage(html: string) {
  open(html);
}
export async function savePdf(html: string) {
  open(html);
}

export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function pageHtml(body: string, page: PageSize, margin = 12) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: ${page.width}mm ${page.height}mm; margin: ${margin}mm; } body { font-family: sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { border-bottom: 1px solid #ddd; padding: 4px; text-align: left; } .muted { color: #666; } .badge { color: #b91c1c; font-weight: bold; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; }</style></head><body>${body}</body></html>`;
}
