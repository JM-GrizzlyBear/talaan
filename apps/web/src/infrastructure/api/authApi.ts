import type { LoginInput, PublicUser, RegisterInput } from "@pern/shared";
import { ApiError, request } from "./http";

// The logged-in user, or null when nobody is logged in
export async function fetchCurrentUser() {
  try {
    const data = await request<{ user: PublicUser }>("/api/auth/me");
    return data.user;
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
