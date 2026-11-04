import { ApiError } from "../../infrastructure/api/http";

// One readable sentence for any error, for the box above a form
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

// The API's message for one form field, if it sent one
export function fieldError(error: unknown, field: string) {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors[field]?.[0];
}
