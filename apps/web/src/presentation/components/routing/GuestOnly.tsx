import { Navigate, Outlet } from "react-router";
import { useCurrentUser } from "../../../application/auth/useAuth";

// Login and register: someone already logged in goes straight to the app
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (user) return <Navigate to="/notes" replace />;
  return <Outlet />;
}
