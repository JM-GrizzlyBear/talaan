import { AUTH_LIMITS } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { fieldError } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { CheckRow, Field } from "../src/ui/form";
import { Button, ErrorNotice, Screen, Txt } from "../src/ui/kit";

// Create an account, the same boxes and consent as the website
export default function Register() {
  const session = useSession();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const register = useMutation({
    mutationFn: () =>
      session.signUp({
        firstName,
        middleName,
        lastName,
        email: email.trim(),
        password,
        // The API checks the box too; it must be exactly true
        consent: consent as true,
      }),
  });
  const error = register.error;
  const anyField = [
    "firstName",
    "middleName",
    "lastName",
    "email",
    "password",
    "consent",
  ].some((f) => fieldError(error, f));

  return (
    <Screen>
      <Txt muted>One account for your whole family's records.</Txt>
      {error && !anyField ? <ErrorNotice error={error} /> : null}
      <Field
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "firstName")}
      />
      <Field
        label="Middle name (optional)"
        value={middleName}
        onChangeText={setMiddleName}
        autoComplete="additional-name"
        textContentType="middleName"
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "middleName")}
      />
      <Field
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        autoComplete="family-name"
        textContentType="familyName"
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "lastName")}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        maxLength={AUTH_LIMITS.emailMax}
        error={fieldError(error, "email")}
      />
      <Field
        label={`Password (at least ${AUTH_LIMITS.passwordMin} characters)`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={AUTH_LIMITS.passwordMax}
        error={fieldError(error, "password")}
      />
      <CheckRow
        label="I agree that Talaan will keep health records for me and the family members I add. I can download or delete them any time."
        value={consent}
        onChange={setConsent}
      />
      {fieldError(error, "consent") ? (
        <ErrorNotice error={new Error(fieldError(error, "consent"))} />
      ) : null}
      <Button onPress={() => register.mutate()} busy={register.isPending}>
        {register.isPending ? "Creating…" : "Create account"}
      </Button>
      <Button kind="link" onPress={() => router.replace("/sign-in")}>
        Already have an account? Sign in
      </Button>
      <Txt tone="tiny" muted>
        Talaan keeps records. It doesn't diagnose or give medical advice.
      </Txt>
    </Screen>
  );
}
