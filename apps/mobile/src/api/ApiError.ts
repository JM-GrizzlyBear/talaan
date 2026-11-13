import { ApiError } from "@talaan/client";

export { ApiError };

export const fieldError = (error: unknown, field: string) =>
  error instanceof ApiError ? error.fieldErrors[field]?.[0] : undefined;

export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
