import { usePathname, useRouter } from "expo-router";
import {
  Bell,
  FolderHeart,
  House,
  type LucideIcon,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "./kit";

// The website's menu, along the bottom like a phone app: the same places in
// the same order (plus Home)
const LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/records", label: "Records", icon: FolderHeart },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/places", label: "Places", icon: Package },
  { to: "/family", label: "Family", icon: Users },
  { to: "/settings/security", label: "Security", icon: ShieldCheck },
];

export function NavBar() {
  const t = useTheme();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: t.card,
        borderTopWidth: 1,
        borderColor: t.edge,
        paddingBottom: insets.bottom,
      }}
    >
      {LINKS.map(({ to, label, icon: Icon }) => {
        const on =
          to === "/"
            ? path === "/"
            : path === to ||
              path.startsWith(`${to}/`) ||
              (to === "/settings/security" && path.startsWith("/settings"));
        return (
          <Pressable
            key={to}
            onPress={() => {
              if (!on || path !== to) router.navigate(to);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 6,
              gap: 2,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon size={22} color={on ? t.brand : t.muted} />
            <Txt
              tone="tiny"
              color={on ? t.brand : t.muted}
              bold={on}
              numberOfLines={1}
              style={{ fontSize: 11 }}
            >
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
