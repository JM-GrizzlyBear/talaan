// A first guess at a passkey's name, like "iPhone" or "Windows computer".
// People can change it before saving.
export function suggestedPasskeyName(userAgent: string) {
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) return "Android phone";
  if (/Windows/.test(userAgent)) return "Windows computer";
  if (/Mac OS X|Macintosh/.test(userAgent)) return "Mac";
  if (/CrOS/.test(userAgent)) return "Chromebook";
  return "My device";
}
