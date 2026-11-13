import {
  dayKey,
  useAgenda,
  useRecordAccounts,
  useReminders,
} from "@talaan/client";
import { ACCESS_LABELS, type RecordAccountInfo } from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Settings } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AgendaList, ReminderList } from "../../src/reminders/ReminderParts";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../../src/ui/kit";

const DAY = 24 * 60 * 60 * 1000;
const accountLabel = (a: RecordAccountInfo) =>
  a.role === "owner"
    ? "My reminders"
    : `${a.ownerName}'s reminders (${ACCESS_LABELS[a.role].name})`;

// Coming up (missed, today, the week) and all reminders, like the website
export default function Reminders() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ owner?: string; view?: string }>();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.owner) ?? list[0] ?? null;
  const view = params.view === "all" ? "all" : "coming";
  const canChange = account?.role === "owner" || account?.role === "manage";
  const add = () =>
    router.push({
      pathname: "/reminders/new",
      params: account ? { owner: account.ownerId } : {},
    });
  return (
    <Screen>
      <Stack.Screen options={{ title: "Reminders" }} />
      <Txt muted>
        Checkups, lab tests, medicine and refills, with alerts on this phone and
        by email.
      </Txt>
      <Buttons>
        {canChange ? (
          <Button small icon={Plus} onPress={add}>
            Add reminder
          </Button>
        ) : null}
        <Button
          kind="secondary"
          small
          icon={Settings}
          onPress={() => router.push("/settings/alerts")}
        >
          My alerts
        </Button>
      </Buttons>
      <ErrorNotice error={accounts.error} />
      {list.length > 1 && account ? (
        <Select
          label="Whose reminders"
          value={account.ownerId}
          onChange={(owner) => router.setParams({ owner })}
          options={list.map((a) => ({
            value: a.ownerId,
            label: accountLabel(a),
          }))}
        />
      ) : null}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderColor: t.edge,
        }}
        accessibilityRole="tablist"
      >
        {(
          [
            ["coming", "Coming up"],
            ["all", "All reminders"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() =>
              router.setParams({ view: value === "all" ? "all" : undefined })
            }
            accessibilityRole="tab"
            accessibilityState={{ selected: view === value }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderColor: view === value ? t.brand : "transparent",
            }}
          >
            <Txt tone="label" color={view === value ? t.brand : t.muted}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>
      {accounts.isPending ? <Loading /> : null}
      {account ? (
        view === "coming" ? (
          <ComingUp
            ownerId={account.ownerId}
            canChange={canChange}
            onAdd={add}
          />
        ) : (
          <AllReminders
            ownerId={account.ownerId}
            canChange={canChange}
            onAdd={add}
          />
        )
      ) : null}
    </Screen>
  );
}

function Nothing({
  text,
  canChange,
  onAdd,
}: {
  text: string;
  canChange: boolean;
  onAdd: () => void;
}) {
  return (
    <Empty
      title={text}
      text="Add a follow-up checkup, a lab test to repeat, medicine to take every day, or when to renew the HMO."
      action={
        canChange ? <Button onPress={onAdd}>Add a reminder</Button> : undefined
      }
    />
  );
}

function ComingUp({
  ownerId,
  canChange,
  onAdd,
}: {
  ownerId: string;
  canChange: boolean;
  onAdd: () => void;
}) {
  const [weeks, setWeeks] = useState(1);
  const [start] = useState(() => Date.now());
  const from = useMemo(() => new Date(start - 2 * DAY), [start]);
  const to = useMemo(() => new Date(start + weeks * 7 * DAY), [start, weeks]);
  const agenda = useAgenda(ownerId, from, to);
  if (agenda.isPending) return <Loading />;
  if (agenda.isError) return <ErrorNotice error={agenda.error} />;
  const now = new Date(agenda.dataUpdatedAt || start);
  const today = dayKey(now);
  const items = agenda.data.items.filter(
    (i) => dayKey(i.at) >= today || i.state === null || i.state === "snoozed",
  );
  const more =
    weeks < 8 ? (
      <Button kind="secondary" onPress={() => setWeeks((w) => w + 1)}>
        Show the next week
      </Button>
    ) : null;
  return (
    <View style={{ gap: 16 }}>
      {items.length === 0 ? (
        <Nothing
          text={
            weeks === 1
              ? "Nothing in the next 7 days."
              : `Nothing in the next ${weeks} weeks.`
          }
          canChange={canChange}
          onAdd={onAdd}
        />
      ) : (
        <AgendaList items={items} canChange={canChange} now={now} />
      )}
      {more}
    </View>
  );
}

function AllReminders({
  ownerId,
  canChange,
  onAdd,
}: {
  ownerId: string;
  canChange: boolean;
  onAdd: () => void;
}) {
  const reminders = useReminders(ownerId);
  if (reminders.isPending) return <Loading />;
  if (reminders.isError) return <ErrorNotice error={reminders.error} />;
  if (reminders.data.reminders.length === 0)
    return (
      <Nothing text="No reminders yet." canChange={canChange} onAdd={onAdd} />
    );
  return <ReminderList reminders={reminders.data.reminders} />;
}
