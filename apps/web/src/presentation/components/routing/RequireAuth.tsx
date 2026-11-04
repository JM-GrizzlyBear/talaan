import { Navigate, Outlet, useLocation } from "react-router";
import { useCurrentUser } from "../../../application/auth/useAuth";

// Pages inside this route need a login; anyone else goes to /login and comes back after
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return (
      <p role="status" className="p-8 text-center text-muted">
        Loading…
      </p>
    );
  }
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
