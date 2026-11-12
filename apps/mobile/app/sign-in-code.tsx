import { useState } from "react";
import { fieldError, messageOf } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { Button, Field, Notice, Screen, Txt } from "../src/ui/kit";

// Two-step sign-in: the 6-digit code from the email
export default function SignInCode() {
  const session = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.submitCode(code);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Txt muted>
        We sent a 6-digit code to {session.codeEmail ?? "your email"}. Enter it
        to finish signing in. It works for 15 minutes.
      </Txt>
      <Field
        label="Code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={fieldError(error, "code")}
      />
      {Boolean(error) && !fieldError(error, "code") && (
        <Notice tone="error">{messageOf(error)}</Notice>
      )}
      {resent && <Notice>A new code is on its way.</Notice>}
      <Button
        onPress={() => void submit()}
        busy={busy}
        disabled={code.length !== 6}
      >
        Finish signing in
      </Button>
      <Button
        kind="secondary"
        onPress={() =>
          void session.api
            .resendCode()
            .then(() => setResent(true))
            .catch(setError)
        }
      >
        Send a new code
      </Button>
      <Button kind="secondary" onPress={() => void session.cancelSignIn()}>
        Start again
      </Button>
    </Screen>
  );
}
