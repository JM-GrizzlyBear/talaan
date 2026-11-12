import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSession } from "../src/auth/SessionProvider";
import { WEB_URL } from "../src/config";
import { useTheme } from "../src/theme/ThemeProvider";
import { Button, Card, Notice, Screen, Txt } from "../src/ui/kit";

const CARDS = [
  {
    to: "/records",
    title: "Records",
    text: "Lab results, X-rays, prescriptions, bills, with their photos",
  },
  {
    to: "/medical-id",
    title: "Medical ID",
    text: "Allergies, blood type, medicines, and who to call",
  },
  {
    to: "/settings",
    title: "Settings",
    text: "Colors, text size, unlocking, signing out",
  },
] as const;

// The first screen: everything the app has so far, one tap away
export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { user, welcomeBack, dismissWelcome, offlineOnly } = useSession();
  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt tone="title">{user ? `Hi, ${user.firstName}` : "Talaan"}</Txt>
        <Txt muted>Your family's medical records, and where the paper is.</Txt>
      </View>
      {welcomeBack && (
        <View style={{ gap: 8 }}>
          <Notice>
            Welcome back! Your account isn't being deleted anymore. Everything
            is as you left it.
          </Notice>
          <Button kind="secondary" onPress={dismissWelcome}>
            OK
          </Button>
        </View>
      )}
      {offlineOnly && (
        <Notice tone="warn">
          No internet: you can see what was saved on this phone.
        </Notice>
      )}
      {CARDS.map((card) => (
        <Card
          key={card.to}
          onPress={() => router.push(card.to)}
          label={card.title}
        >
          <Txt tone="heading" color={t.brand}>
            {card.title}
          </Txt>
          <Txt muted>{card.text}</Txt>
        </Card>
      ))}
      <Card>
        <Txt tone="label">More on the website for now</Txt>
        <Txt tone="small" muted>
          Lab result charts, reminders, places and QR labels, family, and doctor
          links come to the app next.
        </Txt>
        <Button kind="secondary" onPress={() => void Linking.openURL(WEB_URL)}>
          Open the website
        </Button>
      </Card>
    </Screen>
  );
}
