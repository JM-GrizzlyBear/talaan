import type {
  LoginInput,
  LoginResult,
  PublicUser,
  RegisterInput,
  SessionInfo,
  SignedIn,
  SignInCodeInput,
} from "@talaan/shared";
import { signWithPasskeyOnDevice } from "../passkeys/devicePasskeys";
import { ApiError, request } from "./http";

// Who is signed in and whether the website is locked, or null when nobody is
export async function fetchSession() {
  try {
    return await request<SessionInfo>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function register(input: RegisterInput) {
  const data = await request<{ user: PublicUser }>(
    "/api/auth/register",
    "POST",
    input,
  );
  return data.user;
}

// Signed in, or (two-step) a code was emailed first
export async function logIn(input: LoginInput) {
  return await request<LoginResult>("/api/auth/login", "POST", input);
}

export async function submitSignInCode(input: SignInCodeInput) {
  return await request<SignedIn>("/api/auth/login/code", "POST", input);
}

export async function resendSignInCode() {
  await request<void>("/api/auth/login/resend", "POST");
}

// The API makes a challenge, the device signs it, the API checks the signature
export async function signInWithPasskey() {
  const options = await request<unknown>("/api/auth/passkey/options", "POST");
  const response = await signWithPasskeyOnDevice(options);
  return await request<SignedIn>("/api/auth/passkey/verify", "POST", {
    response,
  });
}

export async function unlockWithPasskey() {
  const options = await request<unknown>(
    "/api/auth/unlock/passkey/options",
    "POST",
  );
  const response = await signWithPasskeyOnDevice(options);
  const data = await request<{ user: PublicUser }>(
    "/api/auth/unlock/passkey",
    "POST",
    { response },
  );
  return data.user;
}

export async function logOut() {
  await request<void>("/api/auth/logout", "POST");
}

export async function lockSession() {
  await request<void>("/api/auth/lock", "POST");
}

export async function unlockSession(password: string) {
  const data = await request<{ user: PublicUser }>("/api/auth/unlock", "POST", {
    password,
  });
  return data.user;
}

// Tells the API someone is still using the website, so it doesn't lock
export async function reportActivity() {
  await request<void>("/api/auth/activity", "POST");
}
