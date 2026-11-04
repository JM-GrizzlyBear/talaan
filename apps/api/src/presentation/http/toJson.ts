import type { PublicUser } from "@talaan/shared";
import type { SafeUser } from "../../domain/user/User.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function userJson(user: SafeUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
