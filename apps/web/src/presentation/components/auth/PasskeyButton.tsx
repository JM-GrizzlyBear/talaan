import { FingerprintPattern } from "lucide-react";
import { buttonSecondary } from "../ui/styles";

// "Use a passkey": Face ID, a fingerprint, Windows Hello or the phone's PIN
export function PasskeyButton({
  onClick,
  pending,
  label = "Sign in with a passkey",
}: {
  onClick: () => void;
  pending: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`${buttonSecondary} w-full`}
    >
      <FingerprintPattern aria-hidden="true" className="size-5 text-brand" />
      {pending ? "Waiting for your device…" : label}
    </button>
  );
}
