import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { SESSION_KEY } from "../../../application/auth/useAuth";
import {
  useCheckResetCode,
  useCompletePasswordReset,
  useRequestResetCode,
} from "../../../application/auth/usePasswordReset";
import { NewPasswordStep } from "../../components/auth/passwordReset/NewPasswordStep";
import { ResetCodeStep } from "../../components/auth/passwordReset/ResetCodeStep";
import { ResetEmailStep } from "../../components/auth/passwordReset/ResetEmailStep";
import { fieldError } from "../../format/errorMessage";

type Step = "email" | "code" | "password";

// Forgot password in 3 steps: email → the 6-digit code from the email → a new password
export function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(
    (location.state as { email?: string } | null)?.email ?? "",
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string>();
  const [resent, setResent] = useState(false);

  const requestCode = useRequestResetCode();
  const checkCode = useCheckResetCode();
  const complete = useCompletePasswordReset();

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    try {
      await requestCode.mutateAsync(email);
      setResent(step === "code");
      setCode("");
      checkCode.reset();
      setStep("code");
    } catch {
      // Shown from requestCode.error
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    try {
      await checkCode.mutateAsync({ email, code });
      setStep("password");
    } catch {
      // Shown from checkCode.error
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setConfirmError("The passwords don't match");
      return;
    }
    setConfirmError(undefined);
    try {
      await complete.mutateAsync({ email, code, password });
      // Every device was signed out, this one included
      queryClient.setQueryData(SESSION_KEY, null);
      navigate("/login", {
        replace: true,
        state: { email, passwordChanged: true },
      });
    } catch {
      // Shown from complete.error. A code problem sends them back a step.
      if (fieldError(complete.error, "code")) setStep("code");
    }
  }

  if (step === "code") {
    return (
      <ResetCodeStep
        email={email}
        code={code}
        onCodeChange={setCode}
        onSubmit={submitCode}
        onResend={() => void sendCode()}
        onChangeEmail={() => {
          setStep("email");
          setResent(false);
        }}
        checking={checkCode.isPending}
        sending={requestCode.isPending}
        resent={resent}
        checkError={checkCode.error}
        error={checkCode.error ?? requestCode.error}
      />
    );
  }

  if (step === "password") {
    return (
      <NewPasswordStep
        password={password}
        confirm={confirm}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
        confirmError={confirmError}
        onSubmit={submitPassword}
        pending={complete.isPending}
        error={complete.error}
      />
    );
  }

  return (
    <ResetEmailStep
      email={email}
      onEmailChange={setEmail}
      onSubmit={sendCode}
      pending={requestCode.isPending}
      error={requestCode.error}
    />
  );
}
