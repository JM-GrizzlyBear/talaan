import type { ApiErrorBody } from "@talaan/shared";

export class ApiError extends Error {
  // 0 when the server couldn't be reached at all
  readonly status: number;
  // Field name → messages, when the API rejected a form
  readonly fieldErrors: Record<string, string[] | undefined>;

  constructor(
    status: number,
    message: string,
    fieldErrors: ApiErrorBody["errors"] = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

// Called when the API answers 423 Locked: nobody used the website for a while,
// so the app shows its lock screen. Set once in main.tsx.
let onLocked: (() => void) | null = null;
export function setLockedHandler(handler: (() => void) | null) {
  onLocked = handler;
}

// Every call to the API goes through here. The browser sends the login cookie by itself
// (same address in production; Vite forwards /api in development).
export async function request<T>(
  path: string,
  method: Method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Couldn't reach the server. Check your connection and try again.",
    );
  }

  if (response.status === 423) onLocked?.();

  if (!response.ok) {
    let data: Partial<ApiErrorBody> = {};
    try {
      data = await response.json();
    } catch {
      // Not JSON (for example a proxy's error page): keep the status only
    }
    throw new ApiError(
      response.status,
      data.message ?? `Request failed (${response.status})`,
      data.errors,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
