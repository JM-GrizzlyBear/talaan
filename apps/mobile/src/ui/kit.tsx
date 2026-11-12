import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  type StyleProp,
  Text,
  type TextStyle,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

// The few building blocks every screen uses, in the chosen colors and size

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useTheme();
  const inner = <View style={{ padding: 16, gap: 16 }}>{children}</View>;
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.page }}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={t.brand}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type Tone = "title" | "heading" | "body" | "small" | "label";
const SIZES: Record<Tone, { size: number; weight: TextStyle["fontWeight"] }> = {
  title: { size: 28, weight: "700" },
  heading: { size: 19, weight: "700" },
  body: { size: 16, weight: "400" },
  small: { size: 13, weight: "400" },
  label: { size: 14, weight: "600" },
};

export function Txt({
  children,
  tone = "body",
  muted,
  color,
  style,
  selectable,
  numberOfLines,
}: {
  children: ReactNode;
  tone?: Tone;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
  numberOfLines?: number;
}) {
  const t = useTheme();
  const s = SIZES[tone];
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      accessibilityRole={
        tone === "title" || tone === "heading" ? "header" : undefined
      }
      style={[
        {
          fontSize: s.size * t.scale,
          lineHeight: s.size * t.scale * 1.35,
          fontWeight: s.weight,
          color: color ?? (muted ? t.muted : t.ink),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  label,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  // What a screen reader says for a tappable card
  label?: string;
}) {
  const t = useTheme();
  const look: ViewStyle = {
    backgroundColor: t.card,
    borderColor: t.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  };
  if (!onPress) return <View style={[look, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [look, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  children,
  onPress,
  kind = "primary",
  disabled,
  busy,
}: {
  children: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  busy?: boolean;
}) {
  const t = useTheme();
  const bg =
    kind === "primary" ? t.brand : kind === "danger" ? t.danger : t.card;
  const fg = kind === "secondary" ? t.ink : t.onBrand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        backgroundColor: bg,
        borderWidth: kind === "secondary" ? 1 : 0,
        borderColor: t.edge,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {busy && <ActivityIndicator color={fg} />}
      <Txt tone="label" color={fg} style={{ fontSize: 16 * t.scale }}>
        {children}
      </Txt>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...input
}: TextInputProps & { label: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt tone="label">{label}</Txt>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? t.danger : t.edge,
          backgroundColor: t.card,
          color: t.ink,
          paddingHorizontal: 14,
          fontSize: 17 * t.scale,
        }}
      />
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "error";
}) {
  const t = useTheme();
  const look =
    tone === "error"
      ? { bg: t.dangerSoft, fg: t.danger, edge: t.danger }
      : tone === "warn"
        ? { bg: t.warnSoft, fg: t.warn, edge: t.warnEdge }
        : { bg: t.brandSoft, fg: t.deep, edge: t.brandSoft };
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={{
        backgroundColor: look.bg,
        borderColor: look.edge,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Txt tone="small" color={look.fg} style={{ fontWeight: "600" }}>
        {children}
      </Txt>
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <ActivityIndicator color={t.brand} size="large" />
    </View>
  );
}

// "Label: value" rows
export function Facts({
  rows,
}: {
  rows: [string, string | null | undefined][];
}) {
  const shown = rows.filter(([, v]) => v);
  if (shown.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {shown.map(([label, value]) => (
        <View key={label}>
          <Txt tone="small" muted>
            {label}
          </Txt>
          <Txt selectable>{value}</Txt>
        </View>
      ))}
    </View>
  );
}
