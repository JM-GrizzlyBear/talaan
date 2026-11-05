import { Link } from "react-router";
import { useCurrentUser } from "../../application/auth/useAuth";
import { TalaanLogo } from "../components/brand/TalaanLogo";

// For now: a welcome page after signing in. The dashboard, records, places and
// family screens replace it in version 1.
export function HomePage() {
  const { data: user } = useCurrentUser();

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-12">
      <TalaanLogo className="size-16" />
      <h1 className="text-3xl font-bold">Welcome to Talaan</h1>
      <p className="text-muted">
        {user ? `Hi, ${user.firstName}. ` : ""}Every X-ray, lab result and
        prescription for your family, and where the paper is.
      </p>
      <p className="text-muted">
        Start by inviting family or adding a profile for a child on the{" "}
        <Link to="/family" className="font-semibold text-brand underline">
          Family page
        </Link>
        . Coming next: records, scanning and uploads, places with QR labels and
        reminders.
      </p>
    </main>
  );
}
