import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LockScreen } from "../src/auth/LockScreen";
import { SessionProvider, useSession } from "../src/auth/SessionProvider";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { Loading } from "../src/ui/kit";

const SIGN_IN = ["sign-in", "sign-in-code"];

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
    if (status === "signedOut" && first !== "sign-in")
      router.replace("/sign-in");
    else if (status === "code" && first !== "sign-in-code")
      router.replace("/sign-in-code");
    else if (
      (status === "ready" || status === "locked") &&
      SIGN_IN.includes(first)
    ) {
      router.replace("/");
    }
  }, [status, first, router]);

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
        }}
      >
        <Stack.Screen name="index" options={{ title: "Talaan" }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in-code"
          options={{ title: "Check your email" }}
        />
        <Stack.Screen name="records/index" options={{ title: "Records" }} />
        <Stack.Screen name="records/[id]" options={{ title: "Record" }} />
        <Stack.Screen name="medical-id" options={{ title: "Medical ID" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
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
      new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
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
