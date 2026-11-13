import { afterEach, describe, expect, it, vi } from "vitest";
import { configureApi } from "./http";
import { sendToStorage } from "./upload";

const target = {
  method: "POST" as const,
  url: "https://api.cloudinary.com/v1_1/demo/auto/upload",
  fields: { signature: "abc", timestamp: "1" },
  fileField: "file",
};
const photo = {
  uri: "file:///cache/photo.jpg",
  name: "photo.jpg",
  type: "image/jpeg",
};

afterEach(() => configureApi({ baseUrl: "" }));

describe("sendToStorage on the phone", () => {
  it("uses the phone's uploader for a phone file, with the form fields", async () => {
    const send = vi.fn(async () => ({
      status: 200,
      body: '{"public_id":"x"}',
    }));
    configureApi({ baseUrl: "https://talaan.example", sendPhoneFile: send });
    const progress: number[] = [];
    const answer = await sendToStorage(target, photo, (f) => progress.push(f));
    expect(answer).toEqual({ public_id: "x" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        url: target.url,
        uri: photo.uri,
        type: "image/jpeg",
        fileField: "file",
        fields: target.fields,
      }),
    );
    expect(progress.at(-1)).toBe(1);
  });

  it("says why the storage refused it", async () => {
    configureApi({
      baseUrl: "",
      sendPhoneFile: async () => ({
        status: 400,
        body: '{"error":{"message":"Invalid image file"}}',
      }),
    });
    await expect(sendToStorage(target, photo, () => {})).rejects.toThrow(
      "The file couldn't be stored: Invalid image file",
    );
  });

  it("says the upload stopped when the phone's uploader fails", async () => {
    configureApi({
      baseUrl: "",
      sendPhoneFile: async () => {
        throw new Error("network");
      },
    });
    await expect(sendToStorage(target, photo, () => {})).rejects.toThrow(
      "The upload stopped",
    );
  });
});
