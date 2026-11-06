import { AUTH_LIMITS } from "@talaan/shared";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useRegister } from "../../../application/auth/useAuth";
import { AuthCard } from "../../components/layout/AuthCard";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { TextField } from "../../components/ui/TextField";
import { buttonPrimary } from "../../components/ui/styles";
import { errorMessage, fieldError } from "../../format/errorMessage";

export function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const register = useRegister();
  const navigate = useNavigate();
  // Back to the page that sent people here (like an invitation link), or home
  const from = (useLocation().state as { from?: string } | null)?.from;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      // The API checks the box too; "consent" must be exactly true
      await register.mutateAsync({
        firstName,
        middleName,
        lastName,
        email,
        password,
        consent: consent as true,
      });
      navigate(from ?? "/", { replace: true });
    } catch {
      // Shown below from register.error
    }
  }

  const error = register.error;
  return (
    <AuthCard title="Create an account">
      <p className="-mt-2 mb-5 text-sm text-muted">
        One account for your whole family's records.
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {register.isError && <ErrorAlert message={errorMessage(error)} />}
        <TextField
          label="First name"
          value={firstName}
          onChange={setFirstName}
          autoComplete="given-name"
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "firstName")}
        />
        <TextField
          label="Middle name (optional)"
          value={middleName}
          onChange={setMiddleName}
          autoComplete="additional-name"
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "middleName")}
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={setLastName}
          autoComplete="family-name"
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "lastName")}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          maxLength={AUTH_LIMITS.emailMax}
          error={fieldError(error, "email")}
        />
        <TextField
          label={`Password (at least ${AUTH_LIMITS.passwordMin} characters)`}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          maxLength={AUTH_LIMITS.passwordMax}
          error={fieldError(error, "password")}
        />
        <CheckboxField
          checked={consent}
          onChange={setConsent}
          error={fieldError(error, "consent")}
        >
          I agree that Talaan will keep health records for me and the family
          members I add. I can download or delete them any time.
        </CheckboxField>
        <button
          type="submit"
          disabled={register.isPending}
          className={buttonPrimary}
        >
          {register.isPending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          to="/login"
          state={from ? { from } : undefined}
          className="font-semibold text-brand underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-xs text-muted">
        Talaan keeps records. It doesn't diagnose or give medical advice.
      </p>
    </AuthCard>
  );
}
