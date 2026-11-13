// The token in a family invitation link (…/invite/<token>), or a pasted token
export function tokenFromLink(text: string): string | null {
  const trimmed = text.trim();
  const match = /\/invite\/([A-Za-z0-9_-]{20,100})(?:[/?#]|$)/.exec(trimmed);
  if (match) return match[1] ?? null;
  return /^[A-Za-z0-9_-]{20,100}$/.test(trimmed) ? trimmed : null;
}
