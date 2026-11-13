import { deleteAccount, EXPORT_URL } from "@talaan/client";
import { ACCOUNT_KEEP_DAYS } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { Download } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { fieldError } from "../../src/api/ApiError";
import { useSession } from "../../src/auth/SessionProvider";
import { downloadAndOpen } from "../../src/files/openFile";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Field } from "../../src/ui/form";
import { Button, Card, ErrorNotice, Screen, Txt } from "../../src/ui/kit";

type Mode = "suspend" | "now";

// Your rights under the Data Privacy Act of 2012: a copy of everything, and
// deleting it (only the owner of the account)
export default function YourData() {
  const t = useTheme();
  const router = useRouter();
  const session = useSession();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [mode, setMode] = useState<Mode>("suspend");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async (result) => {
      // Signed out first (this phone forgets everything), then the goodbye
      await session.signedOutElsewhere();
      router.replace({
        pathname: "/goodbye",
        params: result.deleted
          ? { deleted: "1" }
          : { until: result.deleteAfter ?? "" },
      });
    },
  });
  const name = `Talaan ${session.user?.firstName ?? ""} ${new Date().toISOString().slice(0, 10)}.zip`;

  const radio = (value: Mode, title: string, text: string) => (
    <Pressable
      onPress={() => setMode(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: mode === value }}
      style={{
        borderWidth: mode === value ? 2 : 1,
        borderColor: mode === value ? t.danger : t.edge,
        backgroundColor: mode === value ? t.dangerSoft : t.card,
        borderRadius: 12,
        padding: 12,
        gap: 2,
      }}
    >
      <Txt bold>{title}</Txt>
      <Txt tone="small" muted>
        {text}
      </Txt>
    </Pressable>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Your data" }} />
      <Txt muted>
        It's yours: take a copy any time, or delete it. Only you, the owner of
        the account, can do either.
      </Txt>
      <Card>
        <Txt tone="heading">Download your data</Txt>
        <Txt>
          One ZIP file with everything in your account, yours and your family
          profiles':
        </Txt>
        <Txt tone="small">
          • Open me.html: everything, easy to read and print, in any browser
        </Txt>
        <Txt tone="small">
          • Spreadsheets of records, lab results and reminders (Excel or Google
          Sheets)
        </Txt>
        <Txt tone="small">
          • Every photo and PDF, in a folder for each person
        </Txt>
        <Txt tone="small">
          • A complete copy in JSON, for moving to another app
        </Txt>
        <Txt tone="small" muted>
          Records shared with you by others are theirs, so they aren't in it. It
          can take a minute with many photos. You'll get an email that it was
          downloaded. Keep the file somewhere safe: it has private health
          information.
        </Txt>
        <ErrorNotice error={downloadError} />
        <Button
          icon={Download}
          busy={downloading}
          onPress={async () => {
            setDownloading(true);
            setDownloadError(null);
            try {
              await downloadAndOpen(EXPORT_URL, name, "application/zip");
            } catch (e) {
              setDownloadError(e);
            } finally {
              setDownloading(false);
            }
          }}
        >
          {downloading ? "Making the ZIP…" : "Download my data"}
        </Button>
      </Card>
      <Card tone="danger">
        <Txt tone="heading" color={t.danger}>
          Delete your account
        </Txt>
        <Txt tone="small">
          Deletes your account and everything in it: your records and your
          family profiles', every photo and PDF, places, reminders, Medical IDs
          and doctor links. Family you share with lose access. Records others
          share with you stay theirs. Download your data first if you want a
          copy.
        </Txt>
        <Txt tone="label">How</Txt>
        <View style={{ gap: 8 }}>
          {radio(
            "suspend",
            `Suspend now, delete after ${ACCOUNT_KEEP_DAYS / 365} year`,
            "Nobody can see your records from now on, and you're signed out. Signing in within the year brings everything back. We'll email you at 6 months and a week before it's deleted.",
          )}
          {radio(
            "now",
            "Delete everything now",
            "Gone at once, for good. This can't be undone.",
          )}
        </View>
        <Field
          label="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          error={fieldError(remove.error, "password")}
        />
        {mode === "now" ? (
          <Field
            label="Type DELETE to confirm"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            autoCorrect={false}
            error={fieldError(remove.error, "confirm")}
          />
        ) : null}
        {remove.isError &&
        !fieldError(remove.error, "password") &&
        !fieldError(remove.error, "confirm") ? (
          <ErrorNotice error={remove.error} />
        ) : null}
        <Button
          kind="danger"
          busy={remove.isPending}
          disabled={!password || (mode === "now" && confirm !== "DELETE")}
          onPress={() =>
            remove.mutate(
              mode === "now"
                ? { mode, password, confirm: confirm as "DELETE" }
                : { mode, password },
            )
          }
        >
          {remove.isPending
            ? "One moment…"
            : mode === "now"
              ? "Delete everything now"
              : "Suspend my account"}
        </Button>
      </Card>
    </Screen>
  );
}
