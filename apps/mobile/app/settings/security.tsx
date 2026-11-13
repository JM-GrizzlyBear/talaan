import {
  shortDateTime,
  useChangePassword,
  useForgetAllBrowsers,
  useForgetBrowser,
  usePasskeys,
  useRemovePasskey,
  useSignOutOtherDevices,
  useTrustedBrowsers,
  useUpdateSecuritySettings,
} from "@talaan/client";
import {
  AUTH_LIMITS,
  LOCK_AFTER_MINUTES,
  type LockAfterMinutes,
  TRUSTED_BROWSER_DAYS,
} from "@talaan/shared";
import { Stack, useRouter } from "expo-router";
import {
  Database,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  MailCheck,
  Palette,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { fieldError } from "../../src/api/ApiError";
import { connection } from "../../src/api/connection";
import { PHONE_LOCK_NAMES } from "../../src/auth/biometrics";
import { ResetPassword } from "../../src/auth/ResetPassword";
import { useSession } from "../../src/auth/SessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Chips, Field } from "../../src/ui/form";
import {
  Badge,
  Button,
  Buttons,
  Card,
  ErrorNotice,
  List,
  Notice,
  Row,
  Screen,
  Txt,
} from "../../src/ui/kit";

function Part({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: typeof Lock;
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Icon size={20} color={t.brand} />
        <Txt tone="heading" style={{ flex: 1 }}>
          {title}
        </Txt>
      </View>
      {note ? (
        <Txt tone="small" muted>
          {note}
        </Txt>
      ) : null}
      {children}
    </Card>
  );
}

// The website's Security page, plus this phone's Face ID / fingerprint
export default function Security() {
  const router = useRouter();
  const session = useSession();
  const user = session.user;
  if (!user) return null;
  return (
    <Screen>
      <Stack.Screen options={{ title: "Security" }} />
      <ThisPhone />
      <Passkeys />
      <TwoStep twoStepEnabled={user.twoStepEnabled} />
      <LockPart minutes={user.lockAfterMinutes} />
      <ChangePassword email={user.email} />
      <Devices />
      <Part
        icon={Database}
        title="Your data"
        note="Download everything in your account, or delete it."
      >
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Database}
            onPress={() => router.push("/settings/data")}
          >
            Download or delete your data
          </Button>
          <Button
            kind="secondary"
            small
            icon={Palette}
            onPress={() => router.push("/settings/appearance")}
          >
            Colors and text size
          </Button>
        </Buttons>
      </Part>
      <Button
        kind="secondary"
        icon={LogOut}
        onPress={() => void session.signOut()}
      >
        Sign out of this phone
      </Button>
      <Txt tone="tiny" muted>
        Signing out deletes everything Talaan saved on this phone.
      </Txt>
    </Screen>
  );
}

function ThisPhone() {
  const { lock } = useSession();
  return (
    <Part
      icon={Fingerprint}
      title="Unlocking this phone"
      note={
        lock === "none"
          ? "This phone has no screen lock, so Talaan asks for your password. Set a passcode, Face ID or fingerprint in the phone's Settings to unlock without typing."
          : `When Talaan is locked, unlock it with ${PHONE_LOCK_NAMES[lock]}. Your face and fingerprint never leave the phone.`
      }
    />
  );
}

function Passkeys() {
  const passkeys = usePasskeys();
  const remove = useRemovePasskey();
  const list = passkeys.data ?? [];
  return (
    <Part
      icon={KeyRound}
      title="Passkeys"
      note="Sign in on the website with Face ID, a fingerprint or your PIN instead of a password. Add them on the website; in the app, unlocking already uses this phone's Face ID or fingerprint."
    >
      <ErrorNotice error={passkeys.error ?? remove.error} />
      {list.length > 0 ? (
        <List>
          {list.map((p, i) => (
            <Row
              key={p.id}
              first={i === 0}
              title={p.name}
              subtitle={`Added ${shortDateTime(p.createdAt)}${p.lastUsedAt ? ` · Last used ${shortDateTime(p.lastUsedAt)}` : " · Not used yet"}${p.synced ? " · Synced to your other devices" : ""}`}
              right={
                <Button
                  kind="link"
                  small
                  label={`Remove ${p.name}`}
                  onPress={() => remove.mutate(p.id)}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </List>
      ) : passkeys.isSuccess ? (
        <Txt muted>You haven't added a passkey yet.</Txt>
      ) : null}
    </Part>
  );
}

function TwoStep({ twoStepEnabled }: { twoStepEnabled: boolean }) {
  const settings = useUpdateSecuritySettings();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const passwordError = fieldError(settings.error, "currentPassword");
  return (
    <Part
      icon={MailCheck}
      title="Two-step sign-in"
      note="On a phone or browser Talaan doesn't know yet, signing in with your password also needs a code from your email. After that, it's remembered for 30 days. Someone who learns your password still can't get in."
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Txt bold>{twoStepEnabled ? "On" : "Off"}</Txt>
        <Txt tone="small" muted style={{ flex: 1 }}>
          {twoStepEnabled
            ? "· Recommended for health records"
            : "· Only your password protects your account"}
        </Txt>
        {twoStepEnabled ? (
          !confirming ? (
            <Button
              kind="secondary"
              small
              onPress={() => {
                settings.reset();
                setConfirming(true);
              }}
            >
              Turn off
            </Button>
          ) : null
        ) : (
          <Button
            small
            busy={settings.isPending}
            onPress={() => settings.mutate({ twoStepEnabled: true })}
          >
            Turn on
          </Button>
        )}
      </View>
      {settings.isError && !passwordError ? (
        <ErrorNotice error={settings.error} />
      ) : null}
      {confirming ? (
        <View style={{ gap: 10 }}>
          <Field
            label="Enter your password to turn it off"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            error={passwordError}
          />
          <Buttons>
            <Button
              small
              busy={settings.isPending}
              disabled={!password}
              onPress={async () => {
                try {
                  await settings.mutateAsync({
                    twoStepEnabled: false,
                    currentPassword: password,
                  });
                  setConfirming(false);
                  setPassword("");
                } catch {
                  // Shown above
                }
              }}
            >
              Turn off two-step
            </Button>
            <Button
              kind="secondary"
              small
              onPress={() => {
                setConfirming(false);
                setPassword("");
                settings.reset();
              }}
            >
              Keep it on
            </Button>
          </Buttons>
        </View>
      ) : null}
    </Part>
  );
}

function LockPart({ minutes }: { minutes: number }) {
  const settings = useUpdateSecuritySettings();
  const { lockNow } = useSession();
  return (
    <Part
      icon={Lock}
      title="Lock Talaan after I'm away for"
      note="Your records are hidden until you unlock with Face ID, fingerprint or your password. The same time is used on the website."
    >
      <ErrorNotice error={settings.error} />
      <Chips
        value={String(minutes)}
        onChange={(v) =>
          settings.mutate({ lockAfterMinutes: Number(v) as LockAfterMinutes })
        }
        options={LOCK_AFTER_MINUTES.map((m) => ({
          value: String(m),
          label: m === 60 ? "1 hour" : `${m} minutes`,
        }))}
      />
      {settings.isSuccess ? <Notice>Saved.</Notice> : null}
      <Button kind="secondary" small icon={Lock} onPress={lockNow}>
        Lock Talaan now
      </Button>
    </Part>
  );
}

function ChangePassword({ email }: { email: string }) {
  const session = useSession();
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const error = change.error;
  const fieldErrors =
    fieldError(error, "currentPassword") ?? fieldError(error, "newPassword");
  return (
    <Part
      icon={KeyRound}
      title="Change password"
      note="This phone stays signed in. Every other phone and computer is signed out, and we email you about the change."
    >
      {change.isError && !fieldErrors ? <ErrorNotice error={error} /> : null}
      {change.isSuccess ? (
        <Notice>Password changed. Other devices were signed out.</Notice>
      ) : null}
      <Field
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
        error={fieldError(error, "currentPassword")}
      />
      <Field
        label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
        maxLength={AUTH_LIMITS.passwordMax}
        error={fieldError(error, "newPassword")}
      />
      <Button
        busy={change.isPending}
        onPress={async () => {
          try {
            await change.mutateAsync({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
          } catch {
            // Shown above
          }
        }}
      >
        {change.isPending ? "Saving…" : "Change password"}
      </Button>
      {forgot ? (
        <Card tone="soft">
          <ResetPassword
            startEmail={email}
            cancelLabel="Cancel"
            onCancel={() => setForgot(false)}
            onDone={() => void session.signedOutElsewhere()}
          />
        </Card>
      ) : (
        <Button kind="link" small onPress={() => setForgot(true)}>
          Forgot your current password? Email me a code
        </Button>
      )}
    </Part>
  );
}

function Devices() {
  const browsers = useTrustedBrowsers();
  const forget = useForgetBrowser();
  const forgetAll = useForgetAllBrowsers();
  const others = useSignOutOtherDevices();
  const list = browsers.data ?? [];
  return (
    <Part
      icon={Laptop}
      title="Phones and browsers"
      note={`Remembered phones and browsers skip the emailed code for ${TRUSTED_BROWSER_DAYS} days. Forget one you no longer use, or that isn't yours.`}
    >
      <ErrorNotice error={browsers.error ?? forget.error ?? forgetAll.error} />
      {list.length > 0 ? (
        <List>
          {list.map((b, i) => (
            <Row
              key={b.id}
              first={i === 0}
              title={b.label}
              badge={b.current ? <Badge>This phone</Badge> : undefined}
              subtitle={`Last used ${shortDateTime(b.lastUsedAt)} · Remembered until ${shortDateTime(b.expiresAt)}`}
              right={
                <Button
                  kind="link"
                  small
                  label={`Forget ${b.label}`}
                  onPress={() =>
                    forget.mutate(b.id, {
                      onSuccess: () => {
                        if (b.current) void connection.forgetTrust();
                      },
                    })
                  }
                >
                  Forget
                </Button>
              }
            />
          ))}
        </List>
      ) : browsers.isSuccess ? (
        <Txt muted>No remembered phones or browsers.</Txt>
      ) : null}
      <Buttons>
        {list.length > 1 ? (
          <Button
            kind="secondary"
            small
            busy={forgetAll.isPending}
            onPress={() =>
              forgetAll.mutate(undefined, {
                onSuccess: () => void connection.forgetTrust(),
              })
            }
          >
            Forget all
          </Button>
        ) : null}
        <Button
          kind="secondary"
          small
          busy={others.isPending}
          onPress={() => others.mutate()}
        >
          {others.isPending ? "Signing out…" : "Sign out everywhere else"}
        </Button>
      </Buttons>
      {others.isSuccess ? (
        <Notice>Every other browser and device was signed out.</Notice>
      ) : null}
      <ErrorNotice error={others.error} />
    </Part>
  );
}
