import {
  saveAppearance,
  useCurrentUser,
  useUpdateSession,
} from "@talaan/client";
import {
  type Appearance,
  buildTheme,
  COLOR_MODE_LABELS,
  COLOR_MODES,
  DEFAULT_APPEARANCE,
  PALETTES,
  parsePaletteText,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_PERCENT,
  TEXT_SIZES,
} from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Field } from "../../src/ui/form";
import {
  Button,
  Card,
  ErrorNotice,
  Notice,
  Screen,
  Section,
  Txt,
} from "../../src/ui/kit";

const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor };

function Choice({
  on,
  onPress,
  label,
  children,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={{
        flexGrow: 1,
        flexBasis: "30%",
        minWidth: 96,
        gap: 6,
        padding: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: on ? t.brand : t.edge,
        backgroundColor: on ? t.brandSoft : t.card,
      }}
    >
      {children}
    </Pressable>
  );
}

function Swatches({ colors }: { colors: readonly string[] }) {
  return (
    <View
      style={{
        flexDirection: "row",
        height: 28,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {colors.map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

// Colors, light or dark, text size: saved with the account, so the phone and
// the laptop match. Changes show at once.
export default function AppearanceScreen() {
  const t = useTheme();
  const { data: user } = useCurrentUser();
  const updateSession = useUpdateSession();
  const look: Appearance = user?.appearance ?? DEFAULT_APPEARANCE;
  const save = useMutation({
    mutationFn: saveAppearance,
    onMutate: (appearance: Appearance) => {
      const before = user?.appearance;
      updateSession((s) => ({ ...s, user: { ...s.user, appearance } }));
      return { before };
    },
    onError: (_e, _a, context) => {
      const before = context?.before;
      if (before)
        updateSession((s) => ({
          ...s,
          user: { ...s.user, appearance: before },
        }));
    },
    onSuccess: (saved) =>
      updateSession((s) => ({ ...s, user: { ...s.user, ...saved } })),
  });
  const change = (next: Partial<Appearance>) =>
    save.mutate({ ...look, ...next });
  const [text, setText] = useState("");
  const [pasteError, setPasteError] = useState<string>();
  const pasted = text.trim() ? parsePaletteText(text) : null;
  const current = look.palette === "custom" ? look.colors : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Colors and text size" }} />
      <Txt muted>
        Changes show right away and follow you to every phone and computer you
        sign in on.
      </Txt>
      <ErrorNotice error={save.error} />
      <Section title="Light or dark">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {COLOR_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            return (
              <Choice
                key={mode}
                on={look.mode === mode}
                onPress={() => change({ mode })}
                label={COLOR_MODE_LABELS[mode]}
              >
                <View
                  style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Icon size={18} color={t.ink} />
                  <Txt tone="label">{COLOR_MODE_LABELS[mode]}</Txt>
                </View>
                {mode === "system" ? (
                  <Txt tone="tiny" muted>
                    Light by day, dark at night, if your phone switches
                  </Txt>
                ) : null}
              </Choice>
            );
          })}
        </View>
      </Section>
      <Section title="Text size">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TEXT_SIZES.map((size) => (
            <Choice
              key={size}
              on={look.textSize === size}
              onPress={() => change({ textSize: size })}
              label={TEXT_SIZE_LABELS[size]}
            >
              <Txt
                style={{
                  fontSize: 20 * (TEXT_SIZE_PERCENT[size] / 100),
                  fontWeight: "700",
                }}
              >
                Aa
              </Txt>
              <Txt tone="small">{TEXT_SIZE_LABELS[size]}</Txt>
            </Choice>
          ))}
        </View>
      </Section>
      <Section
        title="Colors"
        note="Ready-made sets, most from popular palettes on Color Hunt. Talaan checks each one so text stays easy to read, in light and dark."
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PALETTES.map((p) => {
            const on = look.palette === p.key;
            return (
              <Choice
                key={p.key}
                on={on}
                onPress={() => change({ palette: p.key, colors: [] })}
                label={`${p.name}, ${p.meaning}`}
              >
                <Swatches colors={p.colors} />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <View style={{ flex: 1 }}>
                    <Txt tone="small" bold>
                      {p.name}
                    </Txt>
                    <Txt tone="tiny" muted>
                      {p.meaning}
                    </Txt>
                  </View>
                  {on ? <Check size={16} color={t.brand} /> : null}
                </View>
              </Choice>
            );
          })}
        </View>
      </Section>
      <Card>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Palette size={20} color={t.brand} />
          <Txt tone="heading">Use a palette from Color Hunt</Txt>
        </View>
        <Txt tone="small" muted>
          Find one you like on colorhunt.co, open it, and copy the page's link
          (or its color codes) here.
        </Txt>
        <Button
          kind="link"
          small
          onPress={() =>
            void WebBrowser.openBrowserAsync("https://colorhunt.co/")
          }
        >
          Open colorhunt.co
        </Button>
        <Field
          label="Link or color codes"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setPasteError(undefined);
          }}
          placeholder="https://colorhunt.co/palette/222831393e4600adb5eeeeee"
          autoCapitalize="none"
          autoCorrect={false}
          error={pasteError}
        />
        {pasted ? <Swatches colors={pasted} /> : null}
        <Button
          kind="secondary"
          small
          onPress={() => {
            if (!pasted)
              return setPasteError(
                "Paste a Color Hunt link, or 2 to 4 color codes like #222831 #00ADB5",
              );
            change({ palette: "custom", colors: pasted });
            setText("");
          }}
        >
          Use these colors
        </Button>
        {current ? (
          <View style={{ gap: 6 }}>
            <Txt tone="small" bold>
              Your colors
            </Txt>
            <Swatches colors={current} />
            {buildTheme(current).adjusted ? (
              <Txt tone="tiny" muted>
                Some were made a little darker or lighter so text stays easy to
                read.
              </Txt>
            ) : null}
          </View>
        ) : null}
      </Card>
      <Section title="How it looks">
        <Card>
          <Txt tone="heading">CBC · St. Luke's</Txt>
          <Txt muted>Maria · Oct 5, 2026</Txt>
          <Notice>Filled in from the paper. Look it over, then save.</Notice>
          <Button small onPress={() => {}}>
            Save record
          </Button>
        </Card>
      </Section>
    </Screen>
  );
}
