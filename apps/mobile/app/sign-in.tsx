import * as Linking from "expo-linking";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fieldError, messageOf } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { API_URL, WEB_URL } from "../src/config";
import { useTheme } from "../src/theme/ThemeProvider";
import { Button, Field, Notice, Txt } from "../src/ui/kit";

export default function SignIn() {
  const t = useTheme();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.signIn(email.trim(), password);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

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
          <View style={{ gap: 6 }}>
            <Txt tone="title" color={t.brand}>
              Talaan
            </Txt>
            <Txt muted>
              Your family's medical records, and where the paper is.
            </Txt>
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
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
            onSubmitEditing={() => void submit()}
            error={fieldError(error, "password")}
          />
          {Boolean(error) &&
            !fieldError(error, "email") &&
            !fieldError(error, "password") && (
              <Notice tone="error">{messageOf(error)}</Notice>
            )}
          <Button
            onPress={() => void submit()}
            busy={busy}
            disabled={!email || !password}
          >
            Sign in
          </Button>
          <Button
            kind="secondary"
            onPress={() => void Linking.openURL(`${WEB_URL}/forgot-password`)}
          >
            Forgot password?
          </Button>
          <Txt tone="small" muted style={{ textAlign: "center" }}>
            New here? Make your account on the Talaan website, then sign in
            here.
          </Txt>
          <Button
            kind="secondary"
            onPress={() => void Linking.openURL(`${WEB_URL}/register`)}
          >
            Create an account
          </Button>
          {/* Which server the app uses, to check apps/mobile/.env */}
          <Txt tone="small" muted style={{ textAlign: "center" }}>
            Server: {API_URL.replace(/^https?:\/\//, "")}
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
