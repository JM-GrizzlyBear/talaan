import { fullName } from "@talaan/shared";
import {
  Bell,
  FolderHeart,
  LogOut,
  type LucideIcon,
  Package,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import { useLogOut, useSession } from "../../../application/auth/useAuth";
import { TalaanLogo } from "../brand/TalaanLogo";

const LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/records", label: "Records", icon: FolderHeart },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/places", label: "Places", icon: Package },
  { to: "/family", label: "Family", icon: Users },
  { to: "/settings/security", label: "Security", icon: ShieldCheck },
];

// On a phone: one row of icons with small labels; wider: buttons
const item =
  "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-semibold sm:min-h-10 sm:flex-row sm:gap-1.5 sm:border sm:px-3 sm:text-sm";

export function AppHeader() {
  const { data: session } = useSession();
  const logOut = useLogOut();
  // The lock screen has its own layout
  if (session?.locked) return null;
  const user = session?.user;

  return (
    <header className="border-b border-edge bg-white print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <TalaanLogo className="size-8" />
          Talaan
        </Link>
        {user && (
          <span className="flex items-center gap-3 sm:order-last sm:w-full sm:justify-end lg:order-none lg:w-auto">
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${
                  isActive
                    ? "border-brand bg-brand-soft text-deep"
                    : "border-edge text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <Search aria-hidden="true" className="size-4" />
              Search
            </NavLink>
            <span className="text-sm text-muted">{fullName(user)}</span>
          </span>
        )}
        {user && (
          <nav
            aria-label="Main"
            className="grid w-full grid-cols-6 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:gap-2"
          >
            {LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${item} ${
                    isActive
                      ? "bg-brand-soft text-deep sm:border-brand"
                      : "text-gray-700 hover:bg-gray-50 sm:border-edge sm:bg-white"
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-5 sm:size-4" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => logOut.mutate()}
              disabled={logOut.isPending}
              className={`${item} text-gray-700 hover:bg-gray-50 sm:border-edge sm:bg-white`}
            >
              <LogOut aria-hidden="true" className="size-5 sm:size-4" />
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
