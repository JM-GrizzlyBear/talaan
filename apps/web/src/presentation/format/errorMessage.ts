import { ApiError } from "@talaan/client";
import {
  PasskeyCancelledError,
  PasskeyDeviceError,
} from "../../infrastructure/passkeys/devicePasskeys";

// One readable sentence for any error, for the box above a form
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (
    error instanceof PasskeyCancelledError ||
    error instanceof PasskeyDeviceError
  ) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

// The API's message for one form field, if it sent one
export function fieldError(error: unknown, field: string) {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors[field]?.[0];
}

// Closing the passkey prompt isn't a mistake: shown as a calm note, not in red
export function isPasskeyCancelled(error: unknown) {
  return error instanceof PasskeyCancelledError;
}
