import {
  checkResetCode,
  completePasswordReset,
  requestResetCode,
} from "@talaan/client";
import { AUTH_LIMITS, RESET_CODE } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { fieldError } from "../api/ApiError";
import { Field } from "../ui/form";
import { Button, ErrorNotice, Notice, Txt } from "../ui/kit";

// Forgot password in 3 steps, like the website: email → the code from the
// email → a new password. Then every device is signed out (this one too).
export function ResetPassword({
  startEmail = "",
  onDone,
  onCancel,
  cancelLabel = "Remembered it? Sign in",
}: {
  startEmail?: string;
  onDone: (email: string) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState(startEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const send = useMutation({
    mutationFn: () => requestResetCode(email.trim()),
    onSuccess: () => setStep("code"),
  });
  const check = useMutation({
    mutationFn: () => checkResetCode({ email: email.trim(), code }),
    onSuccess: () => setStep("password"),
  });
  const complete = useMutation({
    mutationFn: () =>
      completePasswordReset({ email: email.trim(), code, password }),
    onSuccess: () => onDone(email.trim()),
    onError: (error) => {
      if (fieldError(error, "code")) setStep("code");
    },
  });

  if (step === "email") {
    return (
      <View style={{ gap: 16 }}>
        <Txt muted>
          Enter the email you signed up with. We'll send you a{" "}
          {RESET_CODE.length}-digit code.
        </Txt>
        {send.error && !fieldError(send.error, "email") ? (
          <ErrorNotice error={send.error} />
        ) : null}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={AUTH_LIMITS.emailMax}
          error={fieldError(send.error, "email")}
          onSubmitEditing={() => send.mutate()}
        />
        <Button
          onPress={() => send.mutate()}
          busy={send.isPending}
          disabled={!email}
        >
          Send the code
        </Button>
        <Button kind="link" onPress={onCancel}>
          {cancelLabel}
        </Button>
      </View>
    );
  }

  if (step === "code") {
    const error = check.error ?? send.error;
    return (
      <View style={{ gap: 16 }}>
        <Txt>
          If {email.trim()} has a Talaan account, we sent a {RESET_CODE.length}
          -digit code to it. It works for {RESET_CODE.minutes} minutes. Check
          your spam folder too.
        </Txt>
        {error && !fieldError(error, "code") ? (
          <ErrorNotice error={error} />
        ) : null}
        <Field
          label="Code"
          value={code}
          onChangeText={(v) =>
            setCode(v.replace(/\D/g, "").slice(0, RESET_CODE.length))
          }
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          error={fieldError(error, "code")}
          onSubmitEditing={() => check.mutate()}
        />
        <Button
          onPress={() => check.mutate()}
          busy={check.isPending}
          disabled={code.length !== RESET_CODE.length}
        >
          Next
        </Button>
        <Button
          kind="secondary"
          onPress={() => send.mutate()}
          busy={send.isPending}
        >
          Send a new code
        </Button>
        <Button kind="link" onPress={() => setStep("email")}>
          Use another email
        </Button>
      </View>
    );
  }

  const error = complete.error;
  return (
    <View style={{ gap: 16 }}>
      <Notice>
        After this, every phone and computer signed in to your account is signed
        out.
      </Notice>
      {error && !fieldError(error, "password") ? (
        <ErrorNotice error={error} />
      ) : null}
      <Field
        label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={AUTH_LIMITS.passwordMax}
        error={fieldError(error, "password")}
      />
      <Field
        label="Type it again"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          setMismatch(false);
        }}
        secureTextEntry
        autoComplete="new-password"
        maxLength={AUTH_LIMITS.passwordMax}
        error={mismatch ? "The passwords don't match" : undefined}
      />
      <Button
        onPress={() => {
          if (password !== confirm) {
            setMismatch(true);
            return;
          }
          complete.mutate();
        }}
        busy={complete.isPending}
      >
        Save the new password
      </Button>
    </View>
  );
}
