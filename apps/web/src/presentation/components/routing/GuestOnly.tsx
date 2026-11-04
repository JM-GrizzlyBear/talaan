import { Navigate, Outlet } from "react-router";
import { useCurrentUser } from "../../../application/auth/useAuth";

// Sign in and sign up: someone already signed in goes straight to the app
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
