// The frame every Talaan email shares: teal header, white card, small footer.
// Inline styles and tables only: email apps ignore most modern CSS.

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SANS = "Figtree, Helvetica, Arial, sans-serif";
const INK = "#12263a";
const MUTED = "#5a6672";
const TEAL = "#0e7c6b";

export function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-family:${SANS};font-weight:700;font-size:16px;padding:14px 24px;border-radius:10px">${escapeHtml(label)}</a>`;
}

export function paragraph(
  html: string,
  options: { muted?: boolean; small?: boolean } = {},
) {
  const size = options.small ? 14 : 16;
  const color = options.muted ? MUTED : INK;
  return `<p style="margin:16px 0 0;font-family:${SANS};font-size:${size}px;line-height:1.6;color:${color}">${html}</p>`;
}

// The 6 digits, big and spaced, easy to read and type
export function codeBlock(code: string) {
  return `<div style="margin:24px 0 0;padding:18px 0;background:#e3f2ef;border-radius:12px;text-align:center;font-family:${SANS};font-size:36px;font-weight:800;letter-spacing:10px;color:${INK}">${escapeHtml(code)}</div>`;
}

export function box(html: string) {
  return `<div style="margin:24px 0 0;background:#f5f6f3;border:1px solid #e1e5df;border-radius:10px;padding:14px 16px;font-family:${SANS};font-size:14px;line-height:1.6;color:${MUTED}">${html}</div>`;
}

export function layout(options: {
  title: string;
  preview: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f3">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(options.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f3">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e5df;border-radius:14px;overflow:hidden">
<tr><td style="background:${TEAL};padding:22px 32px;font-family:${SANS};font-size:22px;font-weight:800;color:#ffffff">Talaan</td></tr>
<tr><td style="padding:32px 32px 28px">
<h1 style="margin:0;font-family:${SANS};font-weight:800;font-size:26px;line-height:1.2;color:${INK}">${escapeHtml(options.title)}</h1>
${options.body}
</td></tr>
<tr><td style="border-top:1px solid #e1e5df;padding:16px 32px 22px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED}">Your family's medical records, and where the paper is.<br>${options.footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
