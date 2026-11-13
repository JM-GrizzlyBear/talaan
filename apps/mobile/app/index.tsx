import { useRouter } from "expo-router";
import {
  Bell,
  ChartLine,
  FolderHeart,
  HeartPulse,
  Link2,
  type LucideIcon,
  Package,
  Palette,
  ScanLine,
  Search,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { useSession } from "../src/auth/SessionProvider";
import { useTheme } from "../src/theme/ThemeProvider";
import { Button, Card, Notice, Screen, Txt } from "../src/ui/kit";
import { TalaanMark } from "../src/ui/TalaanMark";

// The same places as the website's home page, plus scanning a QR label
const PLACES: { to: string; title: string; text: string; icon: LucideIcon }[] =
  [
    {
      to: "/records",
      title: "Records",
      text: "X-rays, lab results, prescriptions, bills, with photos and PDFs",
      icon: FolderHeart,
    },
    {
      to: "/medical-id",
      title: "Medical ID",
      text: "Allergies, blood type, medicines and who to call in an emergency",
      icon: HeartPulse,
    },
    {
      to: "/labs",
      title: "Lab results",
      text: "Every test over time: tables, charts, and what needs attention",
      icon: ChartLine,
    },
    {
      to: "/shares",
      title: "Share with a doctor",
      text: "A link with only the records you choose, until a date you set",
      icon: Link2,
    },
    {
      to: "/reminders",
      title: "Reminders",
      text: "Checkups, lab tests, medicines and refills, with alerts",
      icon: Bell,
    },
    {
      to: "/places",
      title: "Places",
      text: "Where the papers and films are, with QR labels",
      icon: Package,
    },
    {
      to: "/scan",
      title: "Scan a QR label",
      text: "See what's inside a folder, box or envelope",
      icon: ScanLine,
    },
    {
      to: "/family",
      title: "Family",
      text: "Share with family, and keep records for the kids and lolo",
      icon: Users,
    },
    {
      to: "/settings/appearance",
      title: "Colors and text size",
      text: "Light or dark, your own colors, bigger text",
      icon: Palette,
    },
  ];

// The first screen after signing in: everything Talaan keeps, one tap away
export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { user, welcomeBack, dismissWelcome } = useSession();
  const [q, setQ] = useState("");

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <TalaanMark size={52} />
        <View style={{ flex: 1 }}>
          <Txt tone="title">
            {user ? `Hi, ${user.firstName}` : "Welcome to Talaan"}
          </Txt>
        </View>
      </View>
      <Txt muted>
        Every X-ray, lab result and prescription for your family, and where the
        paper is.
      </Txt>
      {welcomeBack && (
        <View style={{ gap: 6 }}>
          <Notice>
            Welcome back! Your account isn't being deleted anymore. Your
            records, family sharing and reminders are just as you left them.
          </Notice>
          <Button kind="link" onPress={dismissWelcome}>
            OK
          </Button>
        </View>
      )}
      <View
        accessibilityRole="search"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 50,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.edge,
          backgroundColor: t.card,
          paddingHorizontal: 14,
        }}
      >
        <Search size={20} color={t.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search records, lab tests, places…"
          placeholderTextColor={t.muted}
          accessibilityLabel="Search everything"
          returnKeyType="search"
          onSubmitEditing={() =>
            router.push({
              pathname: "/search",
              params: q.trim() ? { q: q.trim() } : {},
            })
          }
          style={{
            flex: 1,
            color: t.ink,
            fontSize: 17 * t.scale,
            minHeight: 48,
          }}
        />
      </View>
      {PLACES.map(({ to, title, text, icon: Icon }) => (
        <Card key={to} onPress={() => router.push(to)} label={title}>
          <View
            style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: t.brandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={24} color={t.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt tone="heading" style={{ fontSize: 18 * t.scale }}>
                {title}
              </Txt>
              <Txt tone="small" muted>
                {text}
              </Txt>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
