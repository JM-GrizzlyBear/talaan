import {
  dayHeading,
  dayKey,
  isMissed,
  timeText,
  useOccurrenceAction,
  whenText,
} from "@talaan/client";
import {
  type AgendaInfo,
  describeSchedule,
  type OccurrenceState,
  type ReminderKind,
  type ReminderSummary,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import {
  AlarmClock,
  Bell,
  BellOff,
  Check,
  CreditCard,
  FlaskConical,
  type LucideIcon,
  Pill,
  RefreshCw,
  SkipForward,
  Stethoscope,
  Syringe,
  Undo2,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { messageOf } from "../api/ApiError";
import { useTheme } from "../theme/ThemeProvider";
import { Badge, Button, Buttons, List, Row, Section, Txt } from "../ui/kit";

export const REMINDER_ICONS: Record<ReminderKind, LucideIcon> = {
  checkup: Stethoscope,
  lab: FlaskConical,
  medicine: Pill,
  refill: RefreshCw,
  vaccination: Syringe,
  hmo: CreditCard,
  other: Bell,
};

export function StateBadge({
  state,
}: {
  state: OccurrenceState | "missed" | null;
}) {
  if (!state) return null;
  const [label, tone] = {
    done: ["Done", "brand"],
    skipped: ["Skipped", "muted"],
    snoozed: ["Snoozed", "warn"],
    missed: ["Missed", "danger"],
  }[state] as [string, "brand" | "muted" | "warn" | "danger"];
  return <Badge tone={tone}>{label}</Badge>;
}

const MINUTE = 60 * 1000;

// Done, Skip, Snooze (10 minutes, 1 hour, tomorrow) or Undo for one time
export function OccurrenceActions({
  reminderId,
  at,
  state,
  snoozedUntil,
}: {
  reminderId: string;
  at: string;
  state: OccurrenceState | null;
  snoozedUntil: string | null;
}) {
  const t = useTheme();
  const act = useOccurrenceAction();
  const [snoozing, setSnoozing] = useState(false);
  const send = (action: "done" | "skip" | "clear") =>
    act.mutate({ id: reminderId, action: { at, action } });
  const snooze = (ms: number) => {
    const from = Math.max(Date.now(), new Date(at).getTime());
    act.mutate(
      {
        id: reminderId,
        action: {
          at,
          action: "snooze",
          until: new Date(
            (ms < 24 * 60 * MINUTE ? Date.now() : from) + ms,
          ).toISOString(),
        },
      },
      { onSettled: () => setSnoozing(false) },
    );
  };
  if (state === "done" || state === "skipped") {
    return (
      <Button
        kind="secondary"
        small
        icon={Undo2}
        busy={act.isPending}
        onPress={() => send("clear")}
      >
        Undo
      </Button>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Buttons>
        <Button
          small
          icon={Check}
          disabled={act.isPending}
          onPress={() => send("done")}
        >
          Done
        </Button>
        <Button
          kind="secondary"
          small
          icon={SkipForward}
          disabled={act.isPending}
          onPress={() => send("skip")}
        >
          Skip
        </Button>
        <Button
          kind="secondary"
          small
          icon={AlarmClock}
          disabled={act.isPending}
          onPress={() => setSnoozing(!snoozing)}
        >
          Snooze
        </Button>
      </Buttons>
      {snoozing ? (
        <Buttons>
          <Button kind="secondary" small onPress={() => snooze(10 * MINUTE)}>
            10 minutes
          </Button>
          <Button kind="secondary" small onPress={() => snooze(60 * MINUTE)}>
            1 hour
          </Button>
          <Button
            kind="secondary"
            small
            onPress={() => snooze(24 * 60 * MINUTE)}
          >
            Tomorrow
          </Button>
        </Buttons>
      ) : null}
      {state === "snoozed" && snoozedUntil ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Txt tone="small" color={t.warn}>
            Snoozed until {timeText(snoozedUntil)}.
          </Txt>
          <Button kind="link" small onPress={() => send("clear")}>
            Cancel snooze
          </Button>
        </View>
      ) : null}
      {act.isError ? (
        <Txt tone="small" color={t.danger}>
          {messageOf(act.error)}
        </Txt>
      ) : null}
    </View>
  );
}

type Item = AgendaInfo["items"][number];

// What's coming, grouped by day: Missed first, then Today, Tomorrow…
export function AgendaList({
  items,
  canChange,
  now,
}: {
  items: Item[];
  canChange: boolean;
  now: Date;
}) {
  const t = useTheme();
  const router = useRouter();
  const missed = items.filter((i) => isMissed(i, now));
  const ahead = items.filter((i) => new Date(i.at) >= now || !isMissed(i, now));
  const groups = new Map<string, { heading: string; items: Item[] }>();
  if (missed.length > 0)
    groups.set("missed", { heading: "Missed", items: missed });
  for (const item of ahead) {
    const key = dayKey(item.at);
    const group = groups.get(key) ?? {
      heading: dayHeading(item.at, now),
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return (
    <View style={{ gap: 16 }}>
      {[...groups.entries()].map(([key, group]) => (
        <Section key={key} title={group.heading}>
          <List>
            {group.items.map((item, i) => {
              const Icon = REMINDER_ICONS[item.kind];
              return (
                <View
                  key={`${item.reminderId}|${item.at}`}
                  style={{
                    padding: 12,
                    gap: 10,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderColor: t.edge,
                  }}
                >
                  <Pressable
                    onPress={() => router.push(`/reminders/${item.reminderId}`)}
                    accessibilityRole="link"
                    style={{ flexDirection: "row", gap: 12 }}
                  >
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
                    <View style={{ flex: 1, gap: 2 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <Txt bold>
                          {key === "missed"
                            ? `${dayHeading(item.at, now)}, `
                            : ""}
                          {timeText(item.at)} · {item.title}
                        </Txt>
                        <StateBadge
                          state={key === "missed" ? "missed" : item.state}
                        />
                      </View>
                      <Txt tone="small" muted>
                        {item.personName}
                        {item.dose ? ` · ${item.dose}` : ""}
                        {item.byName && item.state !== "snoozed"
                          ? ` · ${item.state === "done" ? "Done" : "Skipped"} by ${item.byName}`
                          : ""}
                      </Txt>
                    </View>
                  </Pressable>
                  {canChange ? (
                    <OccurrenceActions
                      reminderId={item.reminderId}
                      at={item.at}
                      state={item.state}
                      snoozedUntil={item.snoozedUntil}
                    />
                  ) : null}
                </View>
              );
            })}
          </List>
        </Section>
      ))}
    </View>
  );
}

export function ReminderList({ reminders }: { reminders: ReminderSummary[] }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <List>
      {reminders.map((r, i) => (
        <Row
          key={r.id}
          first={i === 0}
          icon={REMINDER_ICONS[r.kind]}
          title={r.title}
          badge={
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              {r.paused ? <Badge tone="muted">Paused</Badge> : null}
              {r.mutedByMe ? (
                <BellOff
                  size={14}
                  color={t.muted}
                  accessibilityLabel="Your alerts are off"
                />
              ) : null}
            </View>
          }
          subtitle={`${r.personName} · ${describeSchedule(r.schedule)}\n${
            r.paused
              ? "No alerts while paused"
              : r.nextAt
                ? `Next: ${whenText(r.nextAt)}`
                : "Ended"
          }`}
          onPress={() => router.push(`/reminders/${r.id}`)}
        />
      ))}
    </List>
  );
}
