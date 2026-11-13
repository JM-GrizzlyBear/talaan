import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { Children, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messageOf } from "../api/ApiError";
import { useTheme } from "../theme/ThemeProvider";

// The building blocks every screen uses, in the chosen colors and text size.
// They follow the website's look: white cards with a thin edge, the brand
// color for actions, red for what needs attention.

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing,
  footer,
  problem,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  // Stays at the bottom (a Save button)
  footer?: ReactNode;
  // Shown just above the footer, so a problem near the top isn't missed
  problem?: string | null;
}) {
  const t = useTheme();
  const inner = <View style={{ padding: 16, gap: 16 }}>{children}</View>;
  return (
    <SafeAreaView
      edges={["left", "right"]}
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
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer ? (
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderColor: t.edge,
            backgroundColor: t.card,
            gap: 8,
          }}
        >
          {problem ? (
            <Txt tone="small" color={t.danger} bold>
              {problem}
            </Txt>
          ) : null}
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

type Tone = "title" | "heading" | "body" | "small" | "label" | "tiny";
const SIZES: Record<Tone, { size: number; weight: TextStyle["fontWeight"] }> = {
  title: { size: 28, weight: "700" },
  heading: { size: 19, weight: "700" },
  body: { size: 16, weight: "400" },
  small: { size: 14, weight: "400" },
  label: { size: 15, weight: "600" },
  tiny: { size: 12, weight: "400" },
};

export function Txt({
  children,
  tone = "body",
  muted,
  color,
  style,
  selectable,
  numberOfLines,
  bold,
  accessibilityLabel,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  tone?: Tone;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
  numberOfLines?: number;
  bold?: boolean;
}) {
  const t = useTheme();
  const s = SIZES[tone];
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={
        tone === "title" || tone === "heading" ? "header" : undefined
      }
      style={[
        {
          fontSize: s.size * t.scale,
          lineHeight: s.size * t.scale * 1.35,
          fontWeight: bold ? "700" : s.weight,
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
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  // What a screen reader says for a tappable card
  label?: string;
  tone?: "danger" | "warn" | "soft";
}) {
  const t = useTheme();
  const look: ViewStyle = {
    backgroundColor:
      tone === "danger"
        ? t.dangerSoft
        : tone === "warn"
          ? t.warnSoft
          : tone === "soft"
            ? t.brandSoft
            : t.card,
    borderColor:
      tone === "danger" ? t.danger : tone === "warn" ? t.warnEdge : t.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
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
  icon: Icon,
  small,
  label,
}: {
  children: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "link";
  disabled?: boolean;
  busy?: boolean;
  icon?: LucideIcon;
  small?: boolean;
  // For a screen reader, when the words alone aren't clear
  label?: string;
}) {
  const t = useTheme();
  const bg =
    kind === "primary"
      ? t.brand
      : kind === "danger"
        ? t.danger
        : kind === "link"
          ? "transparent"
          : t.card;
  const fg =
    kind === "secondary" ? t.ink : kind === "link" ? t.brand : t.onBrand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => ({
        minHeight: small ? 40 : 48,
        borderRadius: 12,
        paddingHorizontal: kind === "link" ? 4 : small ? 12 : 18,
        alignItems: "center",
        justifyContent: kind === "link" ? "flex-start" : "center",
        alignSelf: kind === "link" ? "flex-start" : undefined,
        flexDirection: "row",
        gap: 8,
        backgroundColor: bg,
        borderWidth: kind === "secondary" ? 1 : 0,
        borderColor: t.edge,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : Icon ? (
        <Icon size={18 * t.scale} color={fg} />
      ) : null}
      <Txt
        tone="label"
        color={fg}
        style={{
          fontSize: (small ? 15 : 16) * t.scale,
          textDecorationLine: kind === "link" ? "underline" : "none",
          flexShrink: 1,
        }}
      >
        {children}
      </Txt>
    </Pressable>
  );
}

// Buttons side by side, wrapping on a narrow phone
export function Buttons({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {children}
    </View>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "error" | "success";
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
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: look.bg,
        borderColor: look.edge,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
      }}
    >
      {/* Words alone (also "You can see {name}'s…", which is several
          pieces) go in text; anything else is passed as it is */}
      {Children.toArray(children).every(
        (c) => typeof c === "string" || typeof c === "number",
      ) ? (
        <Txt tone="small" color={look.fg} style={{ fontWeight: "600" }}>
          {children}
        </Txt>
      ) : (
        children
      )}
    </View>
  );
}

// An error from the API, in words people can act on
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return <Notice tone="error">{messageOf(error)}</Notice>;
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={t.brand} size="large" />
      {label ? <Txt muted>{label}</Txt> : null}
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
    <View style={{ gap: 10 }}>
      {shown.map(([label, value]) => (
        <View key={label}>
          <Txt tone="small" muted>
            {label}
          </Txt>
          <Txt selectable style={{ fontWeight: "500" }}>
            {value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// A titled part of a screen, with an optional action on the right
export function Section({
  title,
  children,
  action,
  note,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  note?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Txt tone="heading" style={{ flexShrink: 1 }}>
          {title}
        </Txt>
        {action}
      </View>
      {note ? (
        <Txt tone="small" muted>
          {note}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

// Rows in one card, like the website's lists
export function List({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.card,
        borderColor: t.edge,
        borderWidth: 1,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  right,
  onPress,
  icon: Icon,
  first,
  badge,
  label,
}: {
  title: string;
  subtitle?: string | null;
  right?: string | ReactNode;
  onPress?: () => void;
  icon?: LucideIcon;
  // No line above the first row
  first?: boolean;
  badge?: ReactNode;
  label?: string;
}) {
  const t = useTheme();
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 56,
        borderTopWidth: first ? 0 : 1,
        borderColor: t.edge,
      }}
    >
      {Icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.brandSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={t.deep} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Txt bold style={{ flexShrink: 1 }}>
            {title}
          </Txt>
          {badge}
        </View>
        {subtitle ? (
          <Txt tone="small" muted>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {typeof right === "string" ? (
        <Txt tone="small" muted>
          {right}
        </Txt>
      ) : (
        right
      )}
      {onPress ? <ChevronRight size={18} color={t.muted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function Badge({
  children,
  tone = "brand",
}: {
  children: string;
  tone?: "brand" | "danger" | "warn" | "muted";
}) {
  const t = useTheme();
  const look =
    tone === "danger"
      ? { bg: t.dangerSoft, fg: t.danger }
      : tone === "warn"
        ? { bg: t.warnSoft, fg: t.warn }
        : tone === "muted"
          ? { bg: t.page, fg: t.muted }
          : { bg: t.brandSoft, fg: t.deep };
  return (
    <View
      style={{
        backgroundColor: look.bg,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Txt tone="tiny" color={look.fg} bold>
        {children}
      </Txt>
    </View>
  );
}

// Nothing here yet, and what to do about it
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: t.edge,
        borderRadius: 14,
        padding: 18,
        gap: 8,
        backgroundColor: t.card,
      }}
    >
      <Txt bold>{title}</Txt>
      {text ? (
        <Txt tone="small" muted>
          {text}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

// Big title with a small line above (the record type) and below (who, when)
export function Heading({
  kicker,
  title,
  sub,
}: {
  kicker?: string;
  title: string;
  sub?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {kicker ? (
        <Txt tone="small" color={t.brand} bold>
          {kicker}
        </Txt>
      ) : null}
      <Txt tone="title" selectable>
        {title}
      </Txt>
      {sub ? <Txt muted>{sub}</Txt> : null}
    </View>
  );
}
