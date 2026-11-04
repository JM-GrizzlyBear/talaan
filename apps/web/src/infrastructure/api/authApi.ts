import type {
  LoginInput,
  PublicUser,
  RegisterInput,
  SessionInfo,
} from "@talaan/shared";
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

export async function logIn(input: LoginInput) {
  const data = await request<{ user: PublicUser }>(
    "/api/auth/login",
    "POST",
    input,
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
