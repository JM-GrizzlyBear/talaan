import { useLocalSearchParams, useRouter } from "expo-router";
import { ResetPassword } from "../src/auth/ResetPassword";
import { Screen } from "../src/ui/kit";

// Forgot password, for someone signed out. (Signed in, the password is
// changed on Security; locked, from the lock screen.)
export default function ForgotPassword() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen>
      <ResetPassword
        startEmail={email ?? ""}
        onDone={() =>
          router.replace({ pathname: "/sign-in", params: { changed: "1" } })
        }
        onCancel={() => router.replace("/sign-in")}
      />
    </Screen>
  );
}
