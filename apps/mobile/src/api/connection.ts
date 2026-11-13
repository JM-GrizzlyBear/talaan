import { configureApi } from "@talaan/client";
import { API_URL, WEB_URL } from "../config";
import { sendPhoneFile } from "../files/sendPhoneFile";
import { savedFetch } from "../offline/savedResponses";
import { secure } from "../storage/secure";
import { deviceName } from "./deviceName";

// How the app reaches the API (the website uses the same calls, from
// @talaan/client, with its cookie). The app has no cookies:
// - the session is a token: sent as "Authorization: Bearer …", replaced
//   whenever the API sends a new one (X-Session-Token)
// - "remember this phone" (two-step sign-in asks for the emailed code once):
//   X-Talaan-Trust, kept after signing out, like a browser's cookie
const TOKEN = "talaan.session";
const TRUST = "talaan.trust";

let token: string | null = null;
let trust: string | null = null;
// Closed while Talaan is locked (or starting): screens behind the lock
// screen don't load anything until it's the owner
let open = false;

export const connection = {
  async load() {
    token = await secure.get(TOKEN);
    trust = await secure.get(TRUST);
    return token;
  },
  hasSession: () => token !== null,
  async forgetSession() {
    token = null;
    await secure.remove(TOKEN);
  },
  // "Forget this phone" on the Security page: the code is asked again
  async forgetTrust() {
    trust = null;
    await secure.remove(TRUST);
  },
  // Whether this phone is remembered (the id part, to find it in the list)
  trustId: () => trust?.split(".")[0] ?? null,
  // For pictures and downloads the app opens itself
  headers: () => headers(),
  setOpen(next: boolean) {
    open = next;
  },
};

// 425 "too early" (not 423): it isn't the server saying it's locked
const LOCKED_BODY = JSON.stringify({ message: "Unlock Talaan first." });

// Before the network: while locked, only signing in and unlocking go out
function gated(realFetch: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (!open && !url.includes("/api/auth/")) {
      return new Response(LOCKED_BODY, {
        status: 425,
        headers: { "Content-Type": "application/json" },
      });
    }
    return await realFetch(input, init);
  }) as typeof fetch;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "X-Talaan-App": "1",
    "X-Talaan-Device": deviceName(),
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (trust) h["X-Talaan-Trust"] = trust;
  return h;
}

export function connectApi(handlers: {
  onLocked: () => void;
  onSignedOut: () => void;
  fetch?: typeof fetch;
}) {
  configureApi({
    baseUrl: API_URL,
    webUrl: WEB_URL,
    credentials: "omit",
    sendPhoneFile,
    // A free server can take up to a minute to wake up
    timeoutMs: 70_000,
    offlineMessage:
      "Couldn't reach Talaan. Check your internet, or try again in a minute.",
    headers,
    onResponse: (response) => {
      const next = response.headers.get("x-session-token");
      if (next) {
        token = next;
        void secure.set(TOKEN, next);
      }
      const remembered = response.headers.get("x-talaan-trust");
      if (remembered) {
        trust = remembered;
        void secure.set(TRUST, remembered);
      }
    },
    onLocked: handlers.onLocked,
    onSignedOut: handlers.onSignedOut,
    fetch: gated(handlers.fetch ?? savedFetch),
  });
}

// Wakes a sleeping server as soon as the app opens (no database, no sign-in),
// so it's ready by the time the person has typed their password
export function wakeServer() {
  void fetch(`${API_URL}/api/ping`, { credentials: "omit" }).catch(() => {});
}
