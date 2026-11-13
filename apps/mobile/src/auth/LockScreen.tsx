import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fieldError, messageOf } from "../api/ApiError";
import { useTheme } from "../theme/ThemeProvider";
import { Field } from "../ui/form";
import { Button, Notice, Txt } from "../ui/kit";
import { TalaanMark } from "../ui/TalaanMark";
import { ResetPassword } from "./ResetPassword";
import { PHONE_LOCK_NAMES } from "./biometrics";
import { useSession } from "./SessionProvider";

// Over everything until it's the owner: Face ID / fingerprint / the phone's
// PIN first (asked straight away), or the Talaan password
export function LockScreen() {
  const t = useTheme();
  const session = useSession();
  const { lock, offlineOnly, user } = session;
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [phoneFailed, setPhoneFailed] = useState(false);
  // Forgot the password while locked: reset it here (like the website)
  const [resetting, setResetting] = useState(false);
  const asked = useRef(false);
  const canUsePhone = lock !== "none";

  const tryPhone = async () => {
    setPhoneFailed(false);
    if (!(await session.unlockWithPhone())) setPhoneFailed(true);
  };

  useEffect(() => {
    if (canUsePhone && !asked.current) {
      asked.current = true;
      void tryPhone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUsePhone]);

  const withPassword = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.unlockWithPassword(password);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.page,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18 }}
      >
        <View style={{ gap: 6 }}>
          <TalaanMark size={44} />
          <Txt tone="title">Talaan is locked</Txt>
          <Txt muted>
            {user
              ? `${user.firstName}'s family health records.`
              : "Your family's health records."}{" "}
            {canUsePhone
              ? `Unlock with ${PHONE_LOCK_NAMES[lock]}.`
              : "Enter your password to unlock."}
          </Txt>
        </View>
        {canUsePhone && (
          <Button
            onPress={() => void tryPhone()}
          >{`Unlock with ${PHONE_LOCK_NAMES[lock]}`}</Button>
        )}
        {phoneFailed && (
          <Notice tone="warn">
            {offlineOnly
              ? "That didn't work. Try again."
              : `That didn't work, or this phone needs the password once more. Try again, or use your password.`}
          </Notice>
        )}
        {offlineOnly && !canUsePhone ? (
          <Notice tone="warn">
            No internet. Connect to unlock with your password (or set a screen
            lock on this phone to unlock with it).
          </Notice>
        ) : (
          <View style={{ gap: 12 }}>
            <Field
              label="Your Talaan password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void withPassword()}
              error={fieldError(error, "password")}
            />
            {Boolean(error) && !fieldError(error, "password") && (
              <Notice tone="error">{messageOf(error)}</Notice>
            )}
            <Button
              kind="secondary"
              onPress={() => void withPassword()}
              busy={busy}
              disabled={!password}
            >
              Unlock with password
            </Button>
          </View>
        )}
        {!offlineOnly && (
          <Button kind="link" onPress={() => setResetting(true)}>
            Forgot password?
          </Button>
        )}
        <Button kind="secondary" onPress={() => void session.signOut()}>
          Not you? Sign out
        </Button>
      </KeyboardAvoidingView>
      <Modal
        visible={resetting}
        animationType="slide"
        onRequestClose={() => setResetting(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: t.page }}>
          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <Txt tone="title">Forgot password</Txt>
            <ResetPassword
              startEmail={user?.email ?? ""}
              cancelLabel="Back to unlocking"
              onCancel={() => setResetting(false)}
              onDone={() => {
                setResetting(false);
                // Every device was signed out, this one too
                void session.signedOutElsewhere();
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
