import { Navigate, Outlet } from "react-router";
import { useSession } from "@talaan/client";

// Forgot password is for someone who can't get in: signed out, or locked and
// unable to unlock. Someone signed in and unlocked changes the password on
// the Security page instead (where "Forgot your current password?" also is).
export function ResetOnlyWhenNeeded() {
  const { data: session, isPending } = useSession();
  if (isPending) return null;
  if (session?.user && !session.locked) {
    return <Navigate to="/settings/security#password" replace />;
  }
  return <Outlet />;
}
