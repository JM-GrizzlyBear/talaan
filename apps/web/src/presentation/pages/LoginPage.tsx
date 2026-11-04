import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLogIn } from "../../application/auth/useAuth";
import { AuthCard } from "../components/layout/AuthCard";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary } from "../components/ui/styles";
import { errorMessage } from "../format/errorMessage";

export function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const logIn = useLogIn();
  const navigate = useNavigate();
  const location = useLocation();
  // Back to the page that asked for a login, or the notes
  const from = (location.state as { from?: string } | null)?.from ?? "/notes";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await logIn.mutateAsync({ login, password });
      navigate(from, { replace: true });
    } catch {
      // Shown below from logIn.error
    }
  }

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {logIn.isError && <ErrorAlert message={errorMessage(logIn.error)} />}
        <TextField
          label="Username or email"
          value={login}
          onChange={setLogin}
          autoComplete="username"
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
        <button
          type="submit"
          disabled={logIn.isPending}
          className={buttonPrimary}
        >
          {logIn.isPending ? "Logging in…" : "Log in"}
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
