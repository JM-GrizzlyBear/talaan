import type { ApiErrorBody } from "@talaan/shared";

export class ApiError extends Error {
  // 0: the server couldn't be reached (offline, or the test server asleep)
  readonly status: number;
  readonly fieldErrors: Record<string, string[] | undefined>;
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

  get offline() {
    return this.status === 0;
  }
}

export const fieldError = (error: unknown, field: string) =>
  error instanceof ApiError ? error.fieldErrors[field]?.[0] : undefined;

export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
