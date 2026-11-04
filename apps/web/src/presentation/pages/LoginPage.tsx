import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLogIn } from "../../application/auth/useAuth";
import { AuthCard } from "../components/layout/AuthCard";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary } from "../components/ui/styles";
import { errorMessage } from "../format/errorMessage";

export function LoginPage() {
  const location = useLocation();
  const state = location.state as {
    from?: string;
    email?: string;
    passwordChanged?: boolean;
  } | null;
  const [email, setEmail] = useState(state?.email ?? "");
  const [password, setPassword] = useState("");
  const logIn = useLogIn();
  const navigate = useNavigate();
  // Back to the page that asked for a sign-in, or the home page
  const from = state?.from ?? "/";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await logIn.mutateAsync({ email, password });
      navigate(from, { replace: true });
    } catch {
      // Shown below from logIn.error
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {state?.passwordChanged && !logIn.isError && (
          <Notice>Password changed. Sign in with your new password.</Notice>
        )}
        {logIn.isError && <ErrorAlert message={errorMessage(logIn.error)} />}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <Link
          to="/forgot-password"
          state={{ email }}
          className="self-start text-sm font-semibold text-brand underline"
        >
          Forgot password?
        </Link>
        <button
          type="submit"
          disabled={logIn.isPending}
          className={buttonPrimary}
        >
          {logIn.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
