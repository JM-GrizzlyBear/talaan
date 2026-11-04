import { LogOut } from "lucide-react";
import { Link } from "react-router";
import { useCurrentUser, useLogOut } from "../../../application/auth/useAuth";
import { buttonSecondary } from "../ui/styles";

export function AppHeader() {
  const { data: user } = useCurrentUser();
  const logOut = useLogOut();

  return (
    <header className="border-b border-edge bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          PERN Template
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">@{user.username}</span>
            <button
              type="button"
              onClick={() => logOut.mutate()}
              disabled={logOut.isPending}
              className={buttonSecondary}
            >
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
