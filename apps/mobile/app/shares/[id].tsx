import {
  type Expiry,
  expiryDate,
  openedText,
  sharedThings,
  shareUrl,
  shortDate,
  shortDateTime,
  useRemoveShare,
  useShare,
  useStopShare,
  useUpdateShare,
} from "@talaan/client";
import {
  RECORD_TYPE_LABELS,
  SHARE_LIMITS,
  type ShareLinkInfo,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { fieldError } from "../../src/api/ApiError";
import { newPin } from "../../src/shares/pin";
import {
  ExpiryPicker,
  LinkBox,
  MaxViewsField,
  ShareStatusBadge,
} from "../../src/shares/ShareParts";
import { useTheme } from "../../src/theme/ThemeProvider";
import { ConfirmBox, Field, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Facts,
  List,
  Loading,
  Notice,
  Row,
  Screen,
  Section,
  Txt,
} from "../../src/ui/kit";

// One link: give it, see who opened it, change it, stop it
export default function ShareScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    pin?: string;
    made?: string;
  }>();
  const link = useShare(params.id);
  const [pin, setPin] = useState(params.pin || undefined);
  const [changing, setChanging] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [removing, setRemoving] = useState(false);
  const stop = useStopShare(params.id);
  const remove = useRemoveShare();
  if (link.isPending) return <Loading />;
  if (link.isError)
    return (
      <Screen>
        <ErrorNotice error={link.error} />
      </Screen>
    );
  const l = link.data;
  const live = l.status === "open" || l.status === "used";
  return (
    <Screen
      onRefresh={() => void link.refetch()}
      refreshing={link.isRefetching}
    >
      <Stack.Screen options={{ title: l.recipient }} />
      <View style={{ gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Txt tone="title">{l.recipient}</Txt>
          <ShareStatusBadge status={l.status} />
        </View>
        <Txt muted>
          {l.personName}'s records · made
          {l.createdByName ? ` by ${l.createdByName}` : ""}{" "}
          {shortDateTime(l.createdAt)}
        </Txt>
      </View>
      {params.made && live ? (
        <Notice>{`The link is ready. Give it to ${l.recipient}${pin ? ", and tell them the PIN" : ""}.`}</Notice>
      ) : null}
      {live ? (
        <LinkBox url={shareUrl(l.token)} recipient={l.recipient} pin={pin} />
      ) : (
        <Card>
          <Txt>
            {l.status === "stopped"
              ? `Stopped${l.stoppedByName ? ` by ${l.stoppedByName}` : ""} ${shortDateTime(l.stoppedAt ?? l.expiresAt)}. The link doesn't open anymore.`
              : `Ended ${shortDateTime(l.expiresAt)}. The link doesn't open anymore.`}
          </Txt>
        </Card>
      )}
      <Card>
        <Facts
          rows={[
            ["Shares", sharedThings(l)],
            [live ? "Works until" : "Ended", shortDateTime(l.expiresAt)],
            ["Opened", openedText(l)],
            ["PIN", l.hasPin ? "Yes" : "No"],
            ["Note for them", l.note],
          ]}
        />
        {l.records.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Txt tone="small" muted>
              Records
            </Txt>
            {l.records.map((r) => (
              <Txt key={r.id}>
                <Txt
                  bold
                  color={t.brand}
                  style={{ textDecorationLine: "underline" }}
                >
                  {r.title}
                </Txt>
                <Txt
                  tone="small"
                  muted
                >{` ${RECORD_TYPE_LABELS[r.type]} · ${shortDate(r.recordDate)}`}</Txt>
              </Txt>
            ))}
          </View>
        ) : null}
      </Card>
      {live ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            onPress={() => void WebBrowser.openBrowserAsync(shareUrl(l.token))}
          >
            See what they see
          </Button>
          {!changing ? (
            <Button kind="secondary" small onPress={() => setChanging(true)}>
              Change time, devices or PIN
            </Button>
          ) : null}
        </Buttons>
      ) : null}
      {live && changing ? (
        <ShareSettings
          link={l}
          onDone={(next) => {
            setChanging(false);
            if (next) setPin(next);
          }}
        />
      ) : null}
      <Section
        title="Who opened it"
        note="Each phone or computer that opened it. You're told by email and notification (at most every half hour), as set in your alert settings. Opening it yourself while signed in isn't counted."
      >
        {l.views.length === 0 ? (
          <Txt muted>Nobody has opened it yet.</Txt>
        ) : (
          <List>
            {l.views.map((v, i) => (
              <Row
                key={`${v.openedAt}-${i}`}
                first={i === 0}
                title={v.device || "A browser"}
                right={shortDateTime(v.openedAt)}
              />
            ))}
          </List>
        )}
        <Button
          kind="link"
          small
          onPress={() => router.push("/settings/alerts")}
        >
          Alert settings
        </Button>
      </Section>
      <ErrorNotice error={stop.error ?? remove.error} />
      {live ? (
        stopping ? (
          <ConfirmBox
            message={`Stop the link? ${l.recipient} won't be able to open it again.`}
            confirmLabel="Yes, stop it"
            busy={stop.isPending}
            onConfirm={() =>
              stop.mutate(undefined, { onSettled: () => setStopping(false) })
            }
            onCancel={() => setStopping(false)}
          />
        ) : (
          <Button kind="danger" onPress={() => setStopping(true)}>
            Stop sharing now
          </Button>
        )
      ) : removing ? (
        <ConfirmBox
          message="Take this link off the list? Its history stays in Activity."
          confirmLabel="Yes, take it off"
          busy={remove.isPending}
          onConfirm={() => {
            remove
              .mutateAsync(l.id)
              .then(() => router.back())
              .catch(() => undefined);
          }}
          onCancel={() => setRemoving(false)}
        />
      ) : (
        <Button kind="secondary" onPress={() => setRemoving(true)}>
          Take off the list
        </Button>
      )}
    </Screen>
  );
}

type PinChange = "keep" | "new" | "remove" | "add";

function ShareSettings({
  link,
  onDone,
}: {
  link: ShareLinkInfo;
  onDone: (pin?: string) => void;
}) {
  const update = useUpdateShare(link.id);
  const [now] = useState(() => new Date());
  const [expiry, setExpiry] = useState<Expiry>({ mode: "preset", key: "7d" });
  const [limitViews, setLimitViews] = useState(link.maxViews !== null);
  const [maxViews, setMaxViews] = useState(String(link.maxViews ?? 1));
  const [pinChange, setPinChange] = useState<PinChange>("keep");
  const [pin, setPin] = useState(() => newPin());
  const [problem, setProblem] = useState<Record<string, string>>({});
  const submit = () => {
    const found: Record<string, string> = {};
    const end = expiryDate(expiry, new Date());
    if ("error" in end) found.expiresAt = end.error;
    const views = Number(maxViews);
    if (
      limitViews &&
      (!Number.isInteger(views) || views < 1 || views > SHARE_LIMITS.maxViews)
    ) {
      found.maxViews = `Enter 1 to ${SHARE_LIMITS.maxViews}`;
    }
    const settingPin = pinChange === "new" || pinChange === "add";
    if (settingPin && !/^\d{6}$/.test(pin)) found.pin = "Use 6 digits";
    setProblem(found);
    if ("error" in end || Object.keys(found).length > 0) return;
    update.mutate(
      {
        expiresAt: end.at.toISOString(),
        maxViews: limitViews ? views : null,
        pin: settingPin ? pin : pinChange === "remove" ? "" : undefined,
      },
      { onSuccess: () => onDone(settingPin ? pin : undefined) },
    );
  };
  return (
    <Card>
      <Txt tone="small" muted>
        The new time counts from now. The link and QR stay the same.
      </Txt>
      <ExpiryPicker value={expiry} onChange={setExpiry} now={now} />
      {(problem.expiresAt ?? fieldError(update.error, "expiresAt")) ? (
        <Notice tone="error">
          {problem.expiresAt ?? fieldError(update.error, "expiresAt") ?? ""}
        </Notice>
      ) : null}
      <MaxViewsField
        on={limitViews}
        value={maxViews}
        onChange={(on, v) => {
          setLimitViews(on);
          setMaxViews(v);
        }}
        error={problem.maxViews}
      />
      <Select
        label="PIN"
        value={pinChange}
        onChange={setPinChange}
        options={
          link.hasPin
            ? [
                { value: "keep" as PinChange, label: "Keep the PIN" },
                { value: "new" as PinChange, label: "Set a new PIN" },
                { value: "remove" as PinChange, label: "No PIN" },
              ]
            : [
                { value: "keep" as PinChange, label: "No PIN" },
                { value: "add" as PinChange, label: "Ask for a PIN" },
              ]
        }
      />
      {pinChange === "new" || pinChange === "add" ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field
              label="New PIN"
              keyboardType="number-pad"
              maxLength={6}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, ""))}
              error={problem.pin}
            />
          </View>
          <Button kind="secondary" small onPress={() => setPin(newPin())}>
            Another
          </Button>
        </View>
      ) : null}
      <ErrorNotice error={update.error} />
      <Buttons>
        <Button busy={update.isPending} onPress={submit}>
          Save changes
        </Button>
        <Button kind="secondary" onPress={() => onDone()}>
          Cancel
        </Button>
      </Buttons>
    </Card>
  );
}
