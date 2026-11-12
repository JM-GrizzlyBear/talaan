import { Link, useSearchParams } from "react-router";
import { TalaanLogo } from "../components/brand/TalaanLogo";
import { buttonSecondary } from "../components/ui/styles";

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(iso));

// After deleting: what happened, and (when suspended) how to come back
export function GoodbyePage() {
  const [params] = useSearchParams();
  const until = params.get("until");
  const deleted = params.get("deleted") === "1" || !until;

  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
      <TalaanLogo className="size-12" />
      {deleted ? (
        <>
          <h1 className="text-3xl font-bold">Your account was deleted</h1>
          <p className="text-muted">
            Everything in it is gone: records, photos and PDFs, places,
            reminders, Medical IDs and doctor links. Thank you for using Talaan.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Your account is suspended</h1>
          <p className="text-muted">
            Nobody can see your records now, and you're signed out everywhere.
            Everything will be deleted for good on{" "}
            <strong className="text-gray-900">{day(until)}</strong>.
          </p>
          <p className="text-muted">
            Changed your mind? Just sign in before then and your account comes
            back as it was.
          </p>
          <Link to="/login" className={buttonSecondary}>
            Sign in
          </Link>
        </>
      )}
    </main>
  );
}
