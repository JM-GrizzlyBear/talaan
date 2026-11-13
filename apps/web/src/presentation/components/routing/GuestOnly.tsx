import { Navigate, Outlet, useLocation } from "react-router";
import { useCurrentUser } from "@talaan/client";

// Sign in and sign up: someone already signed in goes straight to the app,
// or back to the page that sent them here (like an invitation link)
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();
  if (isPending) return null;
  const from = (location.state as { from?: string } | null)?.from;
  if (user) return <Navigate to={from ?? "/"} replace />;
  return <Outlet />;
}
