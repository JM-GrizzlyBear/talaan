import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./http";

function answer(status: number, body?: unknown) {
  return vi.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
      }),
  );
}

describe("calling the API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the JSON body", async () => {
    vi.stubGlobal("fetch", answer(200, { ok: true }));
    expect(await request("/api/health")).toEqual({ ok: true });
  });

  it("turns error answers into ApiError with field errors", async () => {
    vi.stubGlobal(
      "fetch",
      answer(400, {
        message: "Please check the form",
        errors: { title: ["Required"] },
      }),
    );
    const error = await request("/api/notes", "POST", {}).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Please check the form",
      fieldErrors: { title: ["Required"] },
    });
  });

  it("says when the server can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await request("/api/notes").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 0 });
  });

  it("returns nothing for 204 No Content", async () => {
    vi.stubGlobal("fetch", answer(204));
    expect(await request("/api/notes/n1", "DELETE")).toBeUndefined();
  });
});
