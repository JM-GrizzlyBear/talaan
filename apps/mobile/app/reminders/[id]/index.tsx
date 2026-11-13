import {
  shortDateTime,
  useRemoveReminder,
  useReminder,
  useSetMyAlerts,
  useSetPaused,
  whenText,
} from "@talaan/client";
import {
  ACCESS_LABELS,
  describeAlert,
  describeSchedule,
  REMINDER_KIND_LABELS,
  type ReminderInfo,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  BellOff,
  FileText,
  Pause,
  Pencil,
  Play,
} from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import {
  OccurrenceActions,
  REMINDER_ICONS,
  StateBadge,
} from "../../../src/reminders/ReminderParts";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { ConfirmBox } from "../../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  List,
  Loading,
  Screen,
  Section,
  Txt,
} from "../../../src/ui/kit";

export default function ReminderScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const reminder = useReminder(id);
  if (reminder.isPending) return <Loading />;
  if (reminder.isError)
    return (
      <Screen>
        <ErrorNotice error={reminder.error} />
      </Screen>
    );
  return (
    <ReminderView
      reminder={reminder.data}
      onRefresh={() => void reminder.refetch()}
      refreshing={reminder.isRefetching}
    />
  );
}

function ReminderView({
  reminder,
  onRefresh,
  refreshing,
}: {
  reminder: ReminderInfo;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const canChange = reminder.role === "owner" || reminder.role === "manage";
  const paused = useSetPaused();
  const mute = useSetMyAlerts();
  const remove = useRemoveReminder();
  const [confirming, setConfirming] = useState(false);
  const now = new Date();
  const Icon = REMINDER_ICONS[reminder.kind];
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: reminder.title }} />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Icon size={16} color={t.brand} />
          <Txt tone="small" color={t.brand} bold>
            {REMINDER_KIND_LABELS[reminder.kind]} · for {reminder.personName}
          </Txt>
        </View>
        <Txt tone="title">{reminder.title}</Txt>
        {reminder.dose ? <Txt muted>{reminder.dose}</Txt> : null}
        {reminder.paused ? (
          <Txt tone="small" color={t.warn} bold>
            Paused: no alerts until it's resumed
          </Txt>
        ) : null}
        {reminder.role !== "owner" ? (
          <Txt tone="small" muted>
            {reminder.ownerName}'s reminder · You{" "}
            {ACCESS_LABELS[reminder.role].name.toLowerCase()}
          </Txt>
        ) : null}
      </View>
      {canChange ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Pencil}
            onPress={() => router.push(`/reminders/${reminder.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            kind="secondary"
            small
            icon={reminder.paused ? Play : Pause}
            busy={paused.isPending}
            onPress={() =>
              paused.mutate({ id: reminder.id, paused: !reminder.paused })
            }
          >
            {reminder.paused ? "Resume" : "Pause"}
          </Button>
        </Buttons>
      ) : null}
      <ErrorNotice error={paused.error ?? mute.error} />
      <Card>
        <Txt bold>{describeSchedule(reminder.schedule)}</Txt>
        <Txt tone="small" muted>
          Alerts:{" "}
          {reminder.alerts.length === 0
            ? "none"
            : reminder.alerts.map(describeAlert).join(", ")}
          . Times are in Philippine time.
        </Txt>
        {reminder.note ? <Txt>{reminder.note}</Txt> : null}
        {reminder.recordId ? (
          <Button
            kind="link"
            small
            icon={FileText}
            onPress={() => router.push(`/records/${reminder.recordId}`)}
          >
            {`About ${reminder.recordTitle ?? "a record"}`}
          </Button>
        ) : null}
      </Card>
      <Card>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          {reminder.mutedByMe ? (
            <BellOff size={20} color={t.muted} />
          ) : (
            <Bell size={20} color={t.brand} />
          )}
          <View style={{ flex: 1 }}>
            <Txt bold>
              {reminder.mutedByMe
                ? "Your alerts are off"
                : "You get its alerts"}
            </Txt>
            <Txt tone="small" muted>
              Only for you. Others keep theirs.
            </Txt>
          </View>
          <Button
            kind="secondary"
            small
            busy={mute.isPending}
            onPress={() =>
              mute.mutate({ id: reminder.id, muted: !reminder.mutedByMe })
            }
          >
            {reminder.mutedByMe ? "Turn on" : "Turn off"}
          </Button>
        </View>
      </Card>
      <Section title="Next times">
        {reminder.upcoming.length === 0 ? (
          <Txt muted>No times left: it has ended.</Txt>
        ) : (
          <List>
            {reminder.upcoming.map((item, i) => (
              <View
                key={item.at}
                style={{
                  padding: 12,
                  gap: 8,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderColor: t.edge,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Txt bold>{whenText(item.at, now)}</Txt>
                  <StateBadge state={item.state} />
                </View>
                {canChange ? (
                  <OccurrenceActions
                    reminderId={reminder.id}
                    at={item.at}
                    state={item.state}
                    snoozedUntil={item.snoozedUntil}
                  />
                ) : null}
              </View>
            ))}
          </List>
        )}
      </Section>
      {reminder.recent.length > 0 ? (
        <Section title="The last 7 days">
          <List>
            {reminder.recent.map((item, i) => (
              <View
                key={item.at}
                style={{
                  padding: 12,
                  gap: 8,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderColor: t.edge,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Txt bold>{whenText(item.at, now)}</Txt>
                  <StateBadge
                    state={
                      item.state === null || item.state === "snoozed"
                        ? "missed"
                        : item.state
                    }
                  />
                  {item.byName && item.state !== "snoozed" ? (
                    <Txt tone="small" muted>
                      by {item.byName}
                    </Txt>
                  ) : null}
                </View>
                {canChange ? (
                  <OccurrenceActions
                    reminderId={reminder.id}
                    at={item.at}
                    state={item.state}
                    snoozedUntil={item.snoozedUntil}
                  />
                ) : null}
              </View>
            ))}
          </List>
        </Section>
      ) : null}
      <Txt tone="small" muted>
        {reminder.createdByName ? `Added by ${reminder.createdByName}. ` : ""}
        Last changed
        {reminder.updatedByName ? ` by ${reminder.updatedByName}` : ""} on{" "}
        {shortDateTime(reminder.updatedAt)}.
      </Txt>
      {reminder.role === "owner" ? (
        <>
          <ErrorNotice error={remove.error} />
          {confirming ? (
            <ConfirmBox
              message={`Remove “${reminder.title}”? Its alerts stop for everyone.`}
              confirmLabel="Remove"
              busy={remove.isPending}
              onConfirm={() => {
                const ownerId = reminder.ownerId;
                remove
                  .mutateAsync(reminder.id)
                  .then(() =>
                    router.replace({
                      pathname: "/reminders",
                      params: { owner: ownerId },
                    }),
                  )
                  .catch(() => undefined);
              }}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <Button kind="secondary" onPress={() => setConfirming(true)}>
              Remove this reminder
            </Button>
          )}
        </>
      ) : null}
    </Screen>
  );
}
