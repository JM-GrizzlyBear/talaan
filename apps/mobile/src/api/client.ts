import type { ApiErrorBody } from "@talaan/shared";
import { ApiError } from "./ApiError";

type Method = "GET" | "POST" | "PUT" | "DELETE";

// How the app talks to the API. The session is a token (the app has no
// browser cookies): sent as a bearer token, and replaced whenever the API
// sends a new one (signing in, the emailed code).
export interface ClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  setToken: (token: string) => void;
  // 423: the session locked itself (nobody used it for a while)
  onLocked: () => void;
  // 401: signed out (the session ended)
  onSignedOut: () => void;
  fetch?: typeof fetch;
  // How long to wait for an answer. The free test server can take about a
  // minute to wake up, so a little longer than that
  timeoutMs?: number;
}

export const TIMEOUT_MS = 75_000;

export function createClient(options: ClientOptions) {
  const doFetch = options.fetch ?? fetch;

  async function request<T>(
    path: string,
    method: Method = "GET",
    body?: unknown,
  ) {
    const headers: Record<string, string> = { "X-Talaan-App": "1" };
    const token = options.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? TIMEOUT_MS);
    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        // Never a cookie: only the token
        credentials: "omit",
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(
        0,
        timedOut
          ? "Talaan took too long to answer. Please try again."
          : "Couldn't reach Talaan. Check your connection, or try again in a minute (the test server may be waking up).",
      );
    } finally {
      clearTimeout(timer);
    }

    const newToken = response.headers.get("x-session-token");
    if (newToken) options.setToken(newToken);

    if (!response.ok) {
      let data: Partial<ApiErrorBody> = {};
      try {
        data = (await response.json()) as Partial<ApiErrorBody>;
      } catch {
        // Not JSON (a proxy's error page)
      }
      if (response.status === 423) options.onLocked();
      // Only when a session was sent (not a request before it was loaded)
      if (
        response.status === 401 &&
        token &&
        !path.startsWith("/api/auth/login")
      ) {
        options.onSignedOut();
      }
      throw new ApiError(
        response.status,
        data.message ?? "Something went wrong. Please try again.",
        data.errors,
        data.signInExpired ?? false,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  // For pictures: the address and the header that lets the API know who asks
  function fileSource(path: string) {
    const token = options.getToken();
    return {
      uri: `${options.baseUrl}${path}`,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  }

  return { request, fileSource };
}

export type Client = ReturnType<typeof createClient>;
