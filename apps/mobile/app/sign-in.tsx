import { AUTH_LIMITS } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fieldError } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { API_URL } from "../src/config";
import { useTheme } from "../src/theme/ThemeProvider";
import { Field } from "../src/ui/form";
import { Button, ErrorNotice, Notice, Txt } from "../src/ui/kit";
import { TalaanMark } from "../src/ui/TalaanMark";

// Sign in with the email and password. On a phone Talaan doesn't know yet,
// two-step sign-in then asks for the emailed code once; after that this
// phone is remembered.
export default function SignIn() {
  const t = useTheme();
  const router = useRouter();
  const session = useSession();
  const { changed } = useLocalSearchParams<{ changed?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useMutation({
    mutationFn: () => session.signIn(email.trim(), password),
  });
  const error = signIn.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.page }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            gap: 18,
            flexGrow: 1,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 10, alignItems: "flex-start" }}>
            <TalaanMark size={52} />
            <Txt tone="title">Sign in to Talaan</Txt>
            <Txt muted>
              Your family's medical records, and where the paper is.
            </Txt>
          </View>
          {changed && !signIn.isPending ? (
            <Notice>
              Your password was changed and every device was signed out. Sign in
              with the new password.
            </Notice>
          ) : null}
          {error &&
          !fieldError(error, "email") &&
          !fieldError(error, "password") ? (
            <ErrorNotice error={error} />
          ) : null}
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
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => signIn.mutate()}
            error={fieldError(error, "password")}
          />
          <Button
            onPress={() => signIn.mutate()}
            busy={signIn.isPending}
            disabled={!email || !password}
          >
            {signIn.isPending ? "Signing in…" : "Sign in"}
          </Button>
          {signIn.isPending ? (
            <Notice>
              If Talaan was asleep, it can take up to a minute to wake up.
            </Notice>
          ) : null}
          <Button kind="link" onPress={() => router.push("/forgot-password")}>
            Forgot password?
          </Button>
          <View style={{ gap: 8 }}>
            <Txt tone="small" muted>
              New to Talaan?
            </Txt>
            <Button kind="secondary" onPress={() => router.push("/register")}>
              Create an account
            </Button>
          </View>
          <Txt tone="tiny" muted>
            Talaan keeps records. It doesn't diagnose or give medical advice.
          </Txt>
          {__DEV__ ? (
            // Only while testing: which server this copy of the app uses
            <Txt tone="tiny" muted style={{ textAlign: "center" }}>
              Server: {API_URL.replace(/^https?:\/\//, "")}
            </Txt>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
