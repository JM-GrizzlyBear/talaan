import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./ApiError";
import { createClient } from "./client";

function fakeFetch(
  answer: { status?: number; body?: unknown; token?: string },
  seen: { url: string; init: RequestInit }[] = [],
) {
  return vi.fn(async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    const status = answer.status ?? 200;
    return new Response(
      answer.body === undefined ? null : JSON.stringify(answer.body),
      {
        status,
        headers: answer.token ? { "X-Session-Token": answer.token } : {},
      },
    );
  }) as unknown as typeof fetch;
}

const setup = (answer: Parameters<typeof fakeFetch>[0]) => {
  let token: string | null = "old";
  const seen: { url: string; init: RequestInit }[] = [];
  const events: string[] = [];
  const client = createClient({
    baseUrl: "https://api.example.com",
    getToken: () => token,
    setToken: (t) => {
      token = t;
    },
    onLocked: () => events.push("locked"),
    onSignedOut: () => events.push("signedOut"),
    fetch: fakeFetch(answer, seen),
  });
  return { client, seen, events, token: () => token };
};

describe("the app's API client", () => {
  it("sends the token, says it's the app, and keeps a new token", async () => {
    const t = setup({ body: { ok: true }, token: "new" });
    expect(await t.client.request("/api/auth/me")).toEqual({ ok: true });
    const headers = t.seen[0].init.headers as Record<string, string>;
    expect(t.seen[0].url).toBe("https://api.example.com/api/auth/me");
    expect(headers.Authorization).toBe("Bearer old");
    expect(headers["X-Talaan-App"]).toBe("1");
    expect(t.seen[0].init.credentials).toBe("omit");
    expect(t.token()).toBe("new");
  });

  it("turns API errors into messages and field errors", async () => {
    const t = setup({
      status: 400,
      body: {
        message: "Check the form",
        errors: { email: ["Enter your email"] },
      },
    });
    const error = (await t.client
      .request("/api/auth/login", "POST", {})
      .catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors.email).toEqual(["Enter your email"]);
    expect(t.events).toEqual([]);
  });

  it("tells the app when it's locked or signed out", async () => {
    const locked = setup({
      status: 423,
      body: { message: "Locked", locked: true },
    });
    await locked.client.request("/api/records").catch(() => {});
    expect(locked.events).toEqual(["locked"]);
    const out = setup({ status: 401, body: { message: "Sign in" } });
    await out.client.request("/api/records").catch(() => {});
    expect(out.events).toEqual(["signedOut"]);
    // A request made before the session was loaded doesn't sign anyone out
    const early = createClient({
      baseUrl: "https://api.example.com",
      getToken: () => null,
      setToken: () => {},
      onLocked: () => {},
      onSignedOut: () => {
        throw new Error("signed out");
      },
      fetch: fakeFetch({ status: 401, body: { message: "Sign in" } }),
    });
    await expect(early.request("/api/records")).rejects.toThrow("Sign in");
  });

  it("says when it can't reach the server", async () => {
    const client = createClient({
      baseUrl: "https://api.example.com",
      getToken: () => null,
      setToken: () => {},
      onLocked: () => {},
      onSignedOut: () => {},
      fetch: (async () => {
        throw new TypeError("Network request failed");
      }) as unknown as typeof fetch,
    });
    const error = (await client
      .request("/api/records")
      .catch((e: unknown) => e)) as ApiError;
    expect(error.offline).toBe(true);
  });

  it("stops waiting when the server doesn't answer", async () => {
    const client = createClient({
      baseUrl: "https://api.example.com",
      getToken: () => null,
      setToken: () => {},
      onLocked: () => {},
      onSignedOut: () => {},
      timeoutMs: 20,
      // Never answers, until it's told to stop
      fetch: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        })) as unknown as typeof fetch,
    });
    const error = (await client
      .request("/api/auth/login", "POST", {})
      .catch((e: unknown) => e)) as ApiError;
    expect(error.offline).toBe(true);
    expect(error.message).toContain("took too long");
  });

  it("gives pictures the token as a header", () => {
    const t = setup({});
    expect(t.client.fileSource("/api/files/1/content?variant=thumb")).toEqual({
      uri: "https://api.example.com/api/files/1/content?variant=thumb",
      headers: { Authorization: "Bearer old" },
    });
  });
});
