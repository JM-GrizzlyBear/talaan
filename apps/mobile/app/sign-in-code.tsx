import { resendSignInCode } from "@talaan/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { fieldError } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { Field } from "../src/ui/form";
import { Button, ErrorNotice, Notice, Screen, Txt } from "../src/ui/kit";

// Two-step sign-in: the 6-digit code from the email. Only the first time on
// this phone: it's remembered for 30 days after this.
export default function SignInCode() {
  const session = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = useMutation({ mutationFn: () => session.submitCode(code) });
  const resend = useMutation({ mutationFn: resendSignInCode });
  const error = submit.error ?? resend.error;

  return (
    <Screen>
      <Txt>
        We sent a 6-digit code to {session.codeEmail ?? "your email"}. Enter it
        to finish signing in. It works for 15 minutes.
      </Txt>
      <Txt tone="small" muted>
        Only this once on this phone: Talaan remembers it for 30 days, so
        signing in here again won't ask for a code.
      </Txt>
      {error && !fieldError(error, "code") ? (
        <ErrorNotice error={error} />
      ) : null}
      {resend.isSuccess ? <Notice>A new code is on its way.</Notice> : null}
      <Field
        label="Code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => submit.mutate()}
        error={fieldError(error, "code")}
      />
      <Button
        onPress={() => submit.mutate()}
        busy={submit.isPending}
        disabled={code.length !== 6}
      >
        Finish signing in
      </Button>
      <Button
        kind="secondary"
        onPress={() => resend.mutate()}
        busy={resend.isPending}
      >
        Send a new code
      </Button>
      <Button kind="link" onPress={() => void session.cancelSignIn()}>
        Use another email
      </Button>
      <Button kind="link" onPress={() => router.push("/forgot-password")}>
        Forgot password?
      </Button>
    </Screen>
  );
}
