import { describe, expect, it, vi } from "vitest";

// The real store needs the phone (secure storage); a memory one is passed in
vi.mock("../storage/offline", () => ({ offline: {} }));
const { makeSavedFetch, savedName, savedState } =
  await import("./savedResponses");

function memoryStore() {
  const files = new Map<string, { savedAt: string; value: unknown }>();
  return {
    files,
    save: async (name: string, value: unknown) => {
      files.set(name, { savedAt: "2026-11-13T02:00:00.000Z", value });
    },
    load: async <T>(name: string) =>
      (files.get(name) as { savedAt: string; value: T } | undefined) ?? null,
  };
}

describe("what the app reads is kept for offline", () => {
  it("keeps GET answers and gives them back without internet", async () => {
    const store = memoryStore();
    let online = true;
    const real = (async () => {
      if (!online) throw new TypeError("Network request failed");
      return new Response(JSON.stringify({ records: [{ title: "CBC" }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const saved = makeSavedFetch(real, store);
    await saved("https://talaan.example/api/records?ownerId=1");
    await new Promise((r) => setTimeout(r, 0));
    expect(store.files.has(savedName("/api/records?ownerId=1"))).toBe(true);

    online = false;
    const response = await saved(
      "https://talaan.example/api/records?ownerId=1",
    );
    expect(await response.json()).toEqual({ records: [{ title: "CBC" }] });
    expect(response.headers.get("X-Talaan-Saved-At")).toBe(
      "2026-11-13T02:00:00.000Z",
    );
    expect(savedState.current()).toBe("2026-11-13T02:00:00.000Z");

    // Something never opened before: still "no internet"
    await expect(saved("https://talaan.example/api/places")).rejects.toThrow();
    // Back online: the note goes away
    online = true;
    await saved("https://talaan.example/api/records?ownerId=1");
    expect(savedState.current()).toBeNull();
  });

  it("never keeps sign-in answers, downloads or changes", async () => {
    const store = memoryStore();
    const real = (async () =>
      new Response("{}", { status: 200 })) as unknown as typeof fetch;
    const saved = makeSavedFetch(real, store);
    await saved("https://x/api/auth/me");
    await saved("https://x/api/files/1/content?variant=thumb");
    await saved("https://x/api/records", { method: "POST" });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.files.size).toBe(0);
  });
});
