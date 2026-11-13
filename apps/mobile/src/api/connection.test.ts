import { request } from "@talaan/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Secure storage and the phone's name, faked for the test
const stored = new Map<string, string>();
vi.mock("../storage/secure", () => ({
  secure: {
    get: async (k: string) => stored.get(k) ?? null,
    set: async (k: string, v: string) => void stored.set(k, v),
    remove: async (k: string) => void stored.delete(k),
  },
}));
vi.mock("./deviceName", () => ({ deviceName: () => "Maria's iPhone" }));
vi.mock("../offline/savedResponses", () => ({ savedFetch: fetch }));

const { connectApi, connection } = await import("./connection");

function fakeFetch(
  answer: { status?: number; body?: unknown; headers?: Record<string, string> },
  seen: { url: string; init: RequestInit }[],
) {
  return vi.fn(async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return new Response(
      answer.body === undefined ? null : JSON.stringify(answer.body),
      {
        status: answer.status ?? 200,
        headers: answer.headers ?? {},
      },
    );
  }) as unknown as typeof fetch;
}

function setup(answer: Parameters<typeof fakeFetch>[0]) {
  const seen: { url: string; init: RequestInit }[] = [];
  const events: string[] = [];
  connectApi({
    onLocked: () => events.push("locked"),
    onSignedOut: () => events.push("signedOut"),
    fetch: fakeFetch(answer, seen),
  });
  return { seen, events };
}

describe("the app's connection to the API", () => {
  beforeEach(async () => {
    stored.clear();
    await connection.load();
    connection.setOpen(true);
  });

  it("says it's the app, sends no cookies, and keeps the session it's given", async () => {
    const t = setup({
      body: { ok: true },
      headers: { "X-Session-Token": "s:abc.def" },
    });
    await request("/api/auth/me");
    const headers = t.seen[0].init.headers as Record<string, string>;
    expect(headers["X-Talaan-App"]).toBe("1");
    expect(headers["X-Talaan-Device"]).toBe("Maria's iPhone");
    expect(headers.Authorization).toBeUndefined();
    expect(t.seen[0].init.credentials).toBe("omit");
    expect(stored.get("talaan.session")).toBe("s:abc.def");
    // And sends it from then on
    await request("/api/records");
    expect(
      (t.seen[1].init.headers as Record<string, string>).Authorization,
    ).toBe("Bearer s:abc.def");
  });

  it("remembers the phone after the code, and keeps it after signing out", async () => {
    const t = setup({ body: {}, headers: { "X-Talaan-Trust": "1234.sig" } });
    await request("/api/auth/login/code", "POST", { code: "123456" });
    expect(stored.get("talaan.trust")).toBe("1234.sig");
    await connection.forgetSession();
    await request("/api/auth/login", "POST", {});
    expect(
      (t.seen[1].init.headers as Record<string, string>)["X-Talaan-Trust"],
    ).toBe("1234.sig");
    expect(connection.trustId()).toBe("1234");
  });

  it("loads nothing while locked, except signing in and unlocking", async () => {
    const t = setup({ body: { ok: true } });
    connection.setOpen(false);
    await expect(request("/api/records")).rejects.toThrow(
      "Unlock Talaan first.",
    );
    expect(t.seen).toHaveLength(0);
    await request("/api/auth/unlock", "POST", {});
    expect(t.seen).toHaveLength(1);
    // Not mistaken for the server locking it
    expect(t.events).toEqual([]);
  });

  it("tells the app when the server locked it or signed it out", async () => {
    stored.set("talaan.session", "s:old.sig");
    await connection.load();
    const locked = setup({
      status: 423,
      body: { message: "Locked", locked: true },
    });
    await request("/api/records").catch(() => {});
    expect(locked.events).toEqual(["locked"]);
    const out = setup({ status: 401, body: { message: "Sign in" } });
    await request("/api/records").catch(() => {});
    expect(out.events).toEqual(["signedOut"]);
  });
});
