import { fullName } from "@talaan/shared";
import { LogOut, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";
import { useLogOut, useSession } from "../../../application/auth/useAuth";
import { TalaanLogo } from "../brand/TalaanLogo";
import { buttonSecondary } from "../ui/styles";

export function AppHeader() {
  const { data: session } = useSession();
  const logOut = useLogOut();
  // The lock screen has its own layout
  if (session?.locked) return null;
  const user = session?.user;

  return (
    <header className="border-b border-edge bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <TalaanLogo className="size-8" />
          Talaan
        </Link>
        {user && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted">{fullName(user)}</span>
            <Link to="/family" className={buttonSecondary}>
              <Users aria-hidden="true" className="size-4" />
              Family
            </Link>
            <Link to="/settings/security" className={buttonSecondary}>
              <ShieldCheck aria-hidden="true" className="size-4" />
              Security
            </Link>
            <button
              type="button"
              onClick={() => logOut.mutate()}
              disabled={logOut.isPending}
              className={buttonSecondary}
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
