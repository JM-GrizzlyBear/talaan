import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useCurrentUser } from "@talaan/client";
import { ChangePasswordForm } from "../../components/security/ChangePasswordForm";
import { LockSection } from "../../components/security/LockSection";
import { PasskeysSection } from "../../components/security/PasskeysSection";
import { SignedInSection } from "../../components/security/SignedInSection";
import { TwoStepSection } from "../../components/security/TwoStepSection";

// The Security page: passkeys, two-step sign-in, the lock, the password, and browsers
export function SecurityPage() {
  const { data: user } = useCurrentUser();
  const { hash } = useLocation();
  // Coming from "Forgot password" while signed in: go to the password part
  useEffect(() => {
    if (hash && user) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash, user]);
  if (!user) return null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Security</h1>

      <PasskeysSection />
      <TwoStepSection user={user} />

      <LockSection user={user} />

      <ChangePasswordForm email={user.email} />
      <SignedInSection />

      <section className="flex flex-col gap-2 rounded-2xl border border-edge bg-white p-5">
        <h2 className="text-xl font-bold">Your data</h2>
        <p className="text-muted">
          Download everything in your account, or delete it.
        </p>
        <Link
          to="/settings/data"
          className="self-start font-semibold text-brand underline"
        >
          Download or delete your data
        </Link>
        <Link
          to="/settings/appearance"
          className="self-start font-semibold text-brand underline"
        >
          Colors and text size
        </Link>
      </section>
    </main>
  );
}
