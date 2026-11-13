import type { ApiErrorBody } from "@talaan/shared";

export class ApiError extends Error {
  // 0 when the server couldn't be reached at all
  readonly status: number;
  // Field name → messages, when the API rejected a form
  readonly fieldErrors: Record<string, string[] | undefined>;
  // Two-step sign-in took too long: start again from the email and password
  readonly signInExpired: boolean;

  constructor(
    status: number,
    message: string,
    fieldErrors: ApiErrorBody["errors"] = {},
    signInExpired = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors ?? {};
    this.signInExpired = signInExpired;
  }

  // No internet, or the server didn't answer
  get offline() {
    return this.status === 0;
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

// The device's passkey prompt (the website has one; the phone app doesn't yet)
export interface PasskeyDevice {
  create: (options: unknown) => Promise<unknown>;
  sign: (options: unknown) => Promise<unknown>;
}

// How this copy of Talaan talks to the API. The website and the phone app use
// the same calls (this package) and differ only here:
// - the website: the same address as the API, and the browser's cookie
// - the app: the server's address, a token header, no cookies
export interface ApiSettings {
  // "" on the website (same address); "https://…" in the app
  baseUrl: string;
  // Where the website is, for links (doctor share links)
  webUrl?: string;
  // Extra headers for every call (the app's token)
  headers?: () => Record<string, string>;
  // Every answer, before it's read (the app keeps new tokens from it)
  onResponse?: (response: Response) => void;
  // 423 Locked: the session locked itself (nobody used it for a while)
  onLocked?: () => void;
  // 401 on a call that sent a session: it ended
  onSignedOut?: () => void;
  // "omit" in the app: only the token, never a cookie
  credentials?: RequestCredentials;
  // Stop waiting after this long, instead of spinning forever
  timeoutMs?: number;
  // What "couldn't reach" says
  offlineMessage?: string;
  passkeys?: PasskeyDevice;
  fetch?: typeof fetch;
  // The app: sends a file on the phone with the phone's own uploader (more
  // reliable than XMLHttpRequest there, with real progress)
  // (null: it can't, so the usual way is used)
  sendPhoneFile?: (
    upload: PhoneUpload,
  ) => Promise<{ status: number; body: string } | null>;
}

export interface PhoneUpload {
  url: string;
  method: string;
  headers: Record<string, string>;
  uri: string;
  type: string;
  // Multipart (Cloudinary): the form's file field and other fields
  fileField: string | null;
  fields: Record<string, string>;
  onProgress: (fraction: number) => void;
}

let settings: ApiSettings = { baseUrl: "" };

export function configureApi(next: ApiSettings) {
  settings = next;
}

export function apiSettings() {
  return settings;
}

// Called when the API answers 423 Locked (the website shows its lock screen)
export function setLockedHandler(handler: (() => void) | null) {
  settings = { ...settings, onLocked: handler ?? undefined };
}

// The full address of an API path, and the headers it needs (for pictures
// and downloads the app opens itself)
export function apiAddress(path: string) {
  return {
    url: `${settings.baseUrl}${path}`,
    headers: settings.headers?.() ?? {},
  };
}

// Where the website is: the app's setting, or this page's own address
export function webUrl() {
  if (settings.webUrl) return settings.webUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return settings.baseUrl;
}

export function passkeyDevice(): PasskeyDevice {
  if (settings.passkeys) return settings.passkeys;
  throw new ApiError(
    0,
    "Passkeys aren't in the app yet. Use your password, or Face ID / fingerprint after signing in.",
  );
}

// Every call to the API goes through here
export async function request<T>(
  path: string,
  method: Method = "GET",
  body?: unknown,
): Promise<T> {
  const doFetch = settings.fetch ?? fetch;
  const extra = settings.headers?.() ?? {};
  const headers: Record<string, string> = { ...extra };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const controller =
    typeof AbortController === "undefined" ? null : new AbortController();
  let timedOut = false;
  const timer =
    settings.timeoutMs && controller
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, settings.timeoutMs)
      : null;

  let response: Response;
  try {
    response = await doFetch(`${settings.baseUrl}${path}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: settings.credentials,
      signal: controller?.signal,
    });
  } catch {
    throw new ApiError(
      0,
      timedOut
        ? "Talaan is taking too long to answer. Please try again in a minute."
        : (settings.offlineMessage ??
            "Couldn't reach the server. Check your connection and try again."),
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  settings.onResponse?.(response);
  if (response.status === 423) settings.onLocked?.();
  if (
    response.status === 401 &&
    extra.Authorization &&
    !path.startsWith("/api/auth/login")
  ) {
    settings.onSignedOut?.();
  }

  if (!response.ok) {
    let data: Partial<ApiErrorBody> = {};
    try {
      data = (await response.json()) as Partial<ApiErrorBody>;
    } catch {
      // Not JSON (for example a proxy's error page): keep the status only
    }
    throw new ApiError(
      response.status,
      data.message ??
        (response.status === 502 || response.status === 503
          ? "Talaan is starting up. Please try again in a minute."
          : `Request failed (${response.status})`),
      data.errors,
      data.signInExpired === true,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
