import type { PlaceStep } from "@talaan/shared";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "../ui/kit";

// "Drawer › Blue box › Lola's folder", each one opens that place
export function PlacePath({ path }: { path: PlaceStep[] }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
      }}
    >
      {path.map((step, i) => (
        <View
          key={step.id}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          {i > 0 ? (
            <ChevronRight
              size={14}
              color={t.muted}
              accessibilityLabel="inside"
            />
          ) : null}
          <Pressable
            onPress={() => router.push(`/places/${step.id}`)}
            accessibilityRole="link"
            hitSlop={6}
          >
            <Txt
              color={t.brand}
              bold
              style={{ textDecorationLine: "underline" }}
            >
              {step.name}
            </Txt>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
