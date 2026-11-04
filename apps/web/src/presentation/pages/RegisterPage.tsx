import { AUTH_LIMITS } from "@pern/shared";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useRegister } from "../../application/auth/useAuth";
import { AuthCard } from "../components/layout/AuthCard";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary } from "../components/ui/styles";
import { errorMessage, fieldError } from "../format/errorMessage";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await register.mutateAsync({ username, email, password });
      navigate("/notes", { replace: true });
    } catch {
      // Shown below from register.error
    }
  }

  const error = register.error;
  return (
    <AuthCard title="Create an account">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {register.isError && <ErrorAlert message={errorMessage(error)} />}
        <TextField
          label="Username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          maxLength={AUTH_LIMITS.usernameMax}
          error={fieldError(error, "username")}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
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
        <Link to="/login" className="font-semibold text-brand underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
