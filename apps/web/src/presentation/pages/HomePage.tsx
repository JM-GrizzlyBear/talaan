import {
  Bell,
  ChartLine,
  FolderHeart,
  HeartPulse,
  Link2,
  type LucideIcon,
  Package,
  Search,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  useCurrentUser,
  useSession,
  useUpdateSession,
} from "../../application/auth/useAuth";
import { Notice } from "../components/ui/Notice";
import { TalaanLogo } from "../components/brand/TalaanLogo";
import { inputBase } from "../components/ui/styles";

const PLACES: { to: string; title: string; text: string; icon: LucideIcon }[] =
  [
    {
      to: "/records",
      title: "Records",
      text: "X-rays, lab results, prescriptions, bills, with photos and PDFs",
      icon: FolderHeart,
    },
    {
      to: "/medical-id",
      title: "Medical ID",
      text: "Allergies, blood type, medicines and who to call in an emergency",
      icon: HeartPulse,
    },
    {
      to: "/labs",
      title: "Lab results",
      text: "Every test over time: tables, charts, and what needs attention",
      icon: ChartLine,
    },
    {
      to: "/shares",
      title: "Share with a doctor",
      text: "A link with only the records you choose, until a date you set",
      icon: Link2,
    },
    {
      to: "/reminders",
      title: "Reminders",
      text: "Checkups, lab tests, medicines and refills, with alerts",
      icon: Bell,
    },
    {
      to: "/places",
      title: "Places",
      text: "Where the papers and films are, with QR labels",
      icon: Package,
    },
    {
      to: "/family",
      title: "Family",
      text: "Share with family, and keep records for the kids and lolo",
      icon: Users,
    },
  ];

// The first page after signing in: everything Talaan keeps, one tap away
export function HomePage() {
  const { data: user } = useCurrentUser();
  const { data: session } = useSession();
  const updateSession = useUpdateSession();
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-4">
        <TalaanLogo className="size-14" />
        <div>
          <h1 className="text-3xl font-bold">
            {user ? `Hi, ${user.firstName}` : "Welcome to Talaan"}
          </h1>
          <p className="text-muted">
            Every X-ray, lab result and prescription for your family, and where
            the paper is.
          </p>
        </div>
      </div>
      {session?.welcomeBack && (
        <div className="flex flex-col items-start gap-2">
          <Notice>
            Welcome back! Your account isn't being deleted anymore. Your
            records, family sharing and reminders are just as you left them.
          </Notice>
          <button
            type="button"
            onClick={() => updateSession((s) => ({ ...s, welcomeBack: false }))}
            className="cursor-pointer text-sm font-semibold text-brand underline"
          >
            OK
          </button>
        </div>
      )}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q")?.toString().trim();
          void navigate(
            q ? `/search?${new URLSearchParams({ q })}` : "/search",
          );
        }}
        className="relative"
      >
        <label htmlFor="home-search" className="sr-only">
          Search everything
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted"
        />
        <input
          id="home-search"
          name="q"
          type="search"
          enterKeyHint="search"
          placeholder="Search records, lab tests, places…"
          className={`${inputBase} h-12 border-edge pl-11`}
        />
      </form>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLACES.map(({ to, title, text, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex h-full items-start gap-3 rounded-xl border border-edge bg-white p-4 hover:border-brand"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Icon aria-hidden="true" className="size-6 text-brand" />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-semibold">{title}</span>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
