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
}

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

    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        // Never a cookie: only the token
        credentials: "omit",
      });
    } catch {
      throw new ApiError(
        0,
        "Couldn't reach Talaan. Check your connection, or try again in a minute (the test server may be waking up).",
      );
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
