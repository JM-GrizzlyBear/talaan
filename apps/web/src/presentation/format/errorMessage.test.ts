import { describe, expect, it } from "vitest";
import { ApiError } from "../../infrastructure/api/http";
import { errorMessage, fieldError } from "./errorMessage";

describe("error messages", () => {
  it("shows the API's own message", () => {
    expect(
      errorMessage(new ApiError(401, "Wrong username, email or password")),
    ).toBe("Wrong username, email or password");
  });

  it("falls back to a friendly sentence for anything else", () => {
    expect(errorMessage(new TypeError("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("finds the message for one form field", () => {
    const error = new ApiError(409, "That username is taken", {
      username: ["That username is taken"],
    });
    expect(fieldError(error, "username")).toBe("That username is taken");
    expect(fieldError(error, "email")).toBeUndefined();
    expect(fieldError(new Error("x"), "username")).toBeUndefined();
  });
});
