import {
  type Appearance,
  COLOR_MODE_LABELS,
  COLOR_MODES,
  DEFAULT_APPEARANCE,
  PALETTES,
  TEXT_SIZE_LABELS,
  TEXT_SIZES,
} from "@talaan/shared";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { messageOf } from "../src/api/ApiError";
import { PHONE_LOCK_NAMES } from "../src/auth/biometrics";
import { useSession } from "../src/auth/SessionProvider";
import { WEB_URL } from "../src/config";
import { useTheme } from "../src/theme/ThemeProvider";
import { Button, Card, Notice, Screen, Txt } from "../src/ui/kit";

function Choice({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={{
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: on ? t.brand : t.edge,
        backgroundColor: t.card,
      }}
    >
      <Txt tone="label">{label}</Txt>
    </Pressable>
  );
}

// Colors and text size (the same as on the website), unlocking, signing out
export default function Settings() {
  const t = useTheme();
  const session = useSession();
  const { user, api, lock } = session;
  const [error, setError] = useState<unknown>(null);
  const look: Appearance = user?.appearance ?? DEFAULT_APPEARANCE;

  // Shows at once; goes back if saving fails
  const change = async (next: Partial<Appearance>) => {
    if (!user) return;
    const before = user.appearance;
    setError(null);
    session.setUser({ ...user, appearance: { ...look, ...next } });
    try {
      const saved = await api.saveAppearance({ ...look, ...next });
      session.setUser(saved.user);
    } catch (e) {
      session.setUser({ ...user, appearance: before });
      setError(e);
    }
  };

  return (
    <Screen>
      {user && (
        <Card>
          <Txt tone="heading">
            {user.firstName} {user.lastName}
          </Txt>
          <Txt muted>{user.email}</Txt>
        </Card>
      )}
      {Boolean(error) && <Notice tone="error">{messageOf(error)}</Notice>}

      <Txt tone="heading">Light or dark</Txt>
      <View style={{ gap: 8 }}>
        {COLOR_MODES.map((mode) => (
          <Choice
            key={mode}
            label={COLOR_MODE_LABELS[mode]}
            on={look.mode === mode}
            onPress={() => void change({ mode })}
          />
        ))}
      </View>

      <Txt tone="heading">Text size</Txt>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {TEXT_SIZES.map((size) => (
          <View key={size} style={{ flex: 1 }}>
            <Choice
              label={TEXT_SIZE_LABELS[size]}
              on={look.textSize === size}
              onPress={() => void change({ textSize: size })}
            />
          </View>
        ))}
      </View>

      <Txt tone="heading">Colors</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PALETTES.map((p) => {
          const on = look.palette === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => void change({ palette: p.key, colors: [] })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${p.name}, ${p.meaning}`}
              style={{
                width: "31%",
                minWidth: 96,
                flexGrow: 1,
                gap: 6,
                padding: 8,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: on ? t.brand : t.edge,
                backgroundColor: t.card,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  height: 28,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {p.colors.map((c) => (
                  <View key={c} style={{ flex: 1, backgroundColor: c }} />
                ))}
              </View>
              <Txt tone="small" style={{ fontWeight: "700" }}>
                {p.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt tone="small" muted>
        Saved with your account, so your phone and computer match. A Color Hunt
        palette can be pasted in on the website.
      </Txt>

      <Card>
        <Txt tone="heading">Unlocking</Txt>
        <Txt muted>
          {lock === "none"
            ? "This phone has no screen lock, so Talaan asks for your password. Set a screen lock to unlock with your face, fingerprint or PIN."
            : `Talaan locks when it opens, and after you've been away ${user?.lockAfterMinutes ?? 15} minutes. Unlock with ${PHONE_LOCK_NAMES[lock]}.`}
        </Txt>
      </Card>

      <Button
        kind="secondary"
        onPress={() => void Linking.openURL(`${WEB_URL}/settings/security`)}
      >
        Security on the website
      </Button>
      <Button kind="danger" onPress={() => void session.signOut()}>
        Sign out
      </Button>
      <Txt tone="small" muted style={{ textAlign: "center" }}>
        Signing out removes the copies saved on this phone.
      </Txt>
    </Screen>
  );
}
