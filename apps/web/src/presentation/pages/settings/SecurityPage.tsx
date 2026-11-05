import { useCurrentUser } from "../../../application/auth/useAuth";
import { ChangePasswordForm } from "../../components/security/ChangePasswordForm";
import { LockSection } from "../../components/security/LockSection";
import { PasskeysSection } from "../../components/security/PasskeysSection";
import { SignedInSection } from "../../components/security/SignedInSection";
import { TwoStepSection } from "../../components/security/TwoStepSection";

// The Security page: passkeys, two-step sign-in, the lock, the password, and browsers
export function SecurityPage() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Security</h1>

      <PasskeysSection />
      <TwoStepSection user={user} />

      <LockSection user={user} />

      <ChangePasswordForm />
      <SignedInSection />
    </main>
  );
}
