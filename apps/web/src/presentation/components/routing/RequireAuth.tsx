import { Navigate, Outlet, useLocation } from "react-router";
import { useSession } from "@talaan/client";
import { LockScreen } from "../../pages/auth/LockScreen";
import { IdleWatcher } from "../auth/IdleWatcher";
import { Loading } from "../ui/Loading";

// Pages inside this route need a sign-in; anyone else goes to /login and comes back after.
// A locked session sees the lock screen instead of the page.
export function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return <Loading className="p-8 text-center text-muted" />;
  }
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.locked) return <LockScreen user={session.user} />;
  return (
    <>
      <IdleWatcher lockAfterMinutes={session.user.lockAfterMinutes} />
      <Outlet />
    </>
  );
}
