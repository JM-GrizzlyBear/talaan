import { ApiError } from "@talaan/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LockScreen } from "../src/auth/LockScreen";
import { SessionProvider, useSession } from "../src/auth/SessionProvider";
import { AlertScheduler } from "../src/reminders/AlertScheduler";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { Loading } from "../src/ui/kit";
import { NavBar } from "../src/ui/NavBar";
import { OfflineNote } from "../src/ui/OfflineNote";

// Screens for someone who isn't signed in
const SIGNED_OUT = ["sign-in", "register", "forgot-password", "goodbye"];

// Sends people where they belong: signing in, the code, or the app (with the
// lock screen over it until it's the owner)
function Gate() {
  const { status } = useSession();
  const t = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] ?? "";

  useEffect(() => {
    if (status === "starting") return;
    // Starting over: no Back to the screens before (signing in, or the app)
    const go = (to: "/sign-in" | "/sign-in-code" | "/") => {
      if (router.canDismiss()) router.dismissAll();
      router.replace(to);
    };
    if (status === "signedOut" && !SIGNED_OUT.includes(first)) go("/sign-in");
    else if (status === "code" && first !== "sign-in-code")
      router.replace("/sign-in-code");
    else if (
      (status === "ready" || status === "locked") &&
      (SIGNED_OUT.includes(first) || first === "sign-in-code")
    ) {
      go("/");
    }
  }, [status, first, router]);

  const inApp = status === "ready" || status === "locked";
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.brand,
          headerTitleStyle: { color: t.ink, fontWeight: "700" },
          contentStyle: { backgroundColor: t.page },
          headerBackButtonDisplayMode: "minimal",
          headerRight: inApp
            ? () => (
                <Pressable
                  onPress={() => router.push("/search")}
                  accessibilityRole="button"
                  accessibilityLabel="Search everything"
                  hitSlop={10}
                  style={{ padding: 6 }}
                >
                  <Search size={22} color={t.brand} />
                </Pressable>
              )
            : undefined,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Talaan" }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen
          name="register"
          options={{ title: "Create an account" }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Forgot password" }}
        />
        <Stack.Screen name="goodbye" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in-code"
          options={{ title: "Check your email" }}
        />
      </Stack>
      {inApp && <OfflineNote />}
      {inApp && <NavBar />}
      {status === "ready" && <AlertScheduler />}
      {status === "locked" && <LockScreen />}
      {status === "starting" && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.page,
            justifyContent: "center",
          }}
        >
          <Loading />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // An answer from the server (a 404, "unlock first") isn't retried;
            // no internet is tried once more
            retry: (count, error) =>
              !(error instanceof ApiError && error.status > 0) && count < 1,
          },
        },
      }),
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider>
            <Gate />
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
