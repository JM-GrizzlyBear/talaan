import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CodeStep } from "../../components/auth/CodeStep";
import { PasswordStep } from "../../components/auth/PasswordStep";

export function LoginPage() {
  const location = useLocation();
  const state = location.state as {
    from?: string;
    email?: string;
    passwordChanged?: boolean;
  } | null;
  const navigate = useNavigate();
  // Back to the page that asked for a sign-in, or the home page
  const from = state?.from ?? "/";
  const done = () => navigate(from, { replace: true });

  // Two-step: after the password, the masked email the code went to
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  if (codeSentTo) {
    return (
      <CodeStep
        sentTo={codeSentTo}
        onDone={done}
        onStartOver={(timedOut) => {
          setCodeSentTo(null);
          setExpired(timedOut);
        }}
      />
    );
  }
  return (
    <PasswordStep
      initialEmail={state?.email ?? ""}
      passwordChanged={state?.passwordChanged ?? false}
      expired={expired}
      onCodeSent={(email) => {
        setExpired(false);
        setCodeSentTo(email);
      }}
      onDone={done}
    />
  );
}
