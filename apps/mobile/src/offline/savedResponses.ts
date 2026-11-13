import { offline } from "../storage/offline";

// Everything the app reads (GET /api/…) is kept on the phone, encrypted, as
// it comes in. Without internet, the same request gets that copy back, so
// every screen works offline with what was last seen. Changes need internet.

// A short, safe file name for a request path
export function savedName(path: string) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < path.length; i++) {
    const c = path.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return `r-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}-${path.length}`;
}

// Never kept: who is signed in, and anything that's a download
const SKIP = [/^\/api\/auth\//, /\/content(\?|$)/, /^\/api\/account\/export/];

type Listener = (savedAt: string | null) => void;
const listeners = new Set<Listener>();
let showingSaved: string | null = null;

function setShowing(savedAt: string | null) {
  if (savedAt === showingSaved) return;
  showingSaved = savedAt;
  for (const l of listeners) l(savedAt);
}

// When the screen is showing saved copies: the oldest copy's time; null once
// the internet is back
export const savedState = {
  current: () => showingSaved,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset: () => setShowing(null),
};

const pathOf = (url: string) => {
  const at = url.indexOf("/api/");
  return at === -1 ? url : url.slice(at);
};

export function makeSavedFetch(
  realFetch: typeof fetch,
  store: Pick<typeof offline, "save" | "load"> = offline,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const path = pathOf(url);
    const method = (init?.method ?? "GET").toUpperCase();
    const keep = method === "GET" && !SKIP.some((r) => r.test(path));
    let response: Response;
    try {
      response = await realFetch(input, init);
    } catch (error) {
      // Timed out on purpose (the app gave up): not "offline"
      if (!keep || init?.signal?.aborted) throw error;
      const saved = await store.load<{ status: number; body: string }>(
        savedName(path),
      );
      if (!saved) throw error;
      setShowing(
        showingSaved && showingSaved < saved.savedAt
          ? showingSaved
          : saved.savedAt,
      );
      return new Response(saved.value.body, {
        status: saved.value.status,
        headers: {
          "Content-Type": "application/json",
          "X-Talaan-Saved-At": saved.savedAt,
        },
      });
    }
    if (keep && response.ok && response.status !== 204) {
      setShowing(null);
      const body = await response.clone().text();
      void store.save(savedName(path), { status: response.status, body });
    } else if (response.ok) {
      setShowing(null);
    }
    return response;
  }) as typeof fetch;
}

export const savedFetch: typeof fetch = (input, init) =>
  makeSavedFetch(fetch)(input, init);
