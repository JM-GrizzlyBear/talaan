import type { PublicUser } from "@talaan/shared";
import type { SafeUser } from "../../domain/user/User.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function userJson(user: SafeUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    lockAfterMinutes: user.lockAfterMinutes,
    createdAt: user.createdAt.toISOString(),
  };
}
