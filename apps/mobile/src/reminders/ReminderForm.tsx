import {
  KIND_ALERTS,
  reminderFieldsFromForm,
  type ReminderFormState,
  type RepeatChoice,
  SERVER_FIELDS,
  supplyCount,
  useCreateReminder,
  useUpdateReminder,
  whenText,
} from "@talaan/client";
import {
  ALERT_PRESETS,
  describeAlert,
  describeSchedule,
  nextOccurrences,
  type RecordAccountInfo,
  REMINDER_KIND_LABELS,
  REMINDER_KINDS,
  REMINDER_LIMITS,
  type ReminderInfo,
  type ReminderKind,
  scheduleSchema,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import { CalendarClock, FileText, Plus, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { fieldError, messageOf } from "../api/ApiError";
import { useTheme } from "../theme/ThemeProvider";
import { DateField } from "../ui/DateField";
import { CheckRow, Chips, Field, Select } from "../ui/form";
import { Button, Buttons, Card, Notice, Screen, Txt } from "../ui/kit";
import { REMINDER_ICONS } from "./ReminderParts";

type Set = <K extends keyof ReminderFormState>(
  key: K,
  value: ReminderFormState[K],
) => void;
type Err = (key: string) => string | undefined;

const PLACEHOLDERS: Record<string, string> = {
  checkup: "Follow-up with Dr. Santos",
  lab: "Repeat FBS and lipid profile",
  medicine: "Metformin",
  refill: "Buy Losartan at Mercury Drug",
  vaccination: "Flu vaccine",
  hmo: "Renew Maxicare",
  other: "What to remember",
};
const PRESETS = [
  { label: "Once a day", times: ["08:00"] },
  { label: "Twice a day", times: ["08:00", "20:00"] },
  { label: "3 times a day", times: ["08:00", "13:00", "20:00"] },
  { label: "4 times a day", times: ["06:00", "12:00", "18:00", "22:00"] },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const UNITS: Record<Exclude<RepeatChoice, "none">, [string, string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
  year: ["year", "years"],
};
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440 } as const;

function Part({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <Card>
      <Txt tone="heading">{title}</Txt>
      {note ? (
        <Txt tone="small" muted>
          {note}
        </Txt>
      ) : null}
      <View style={{ gap: 12 }}>{children}</View>
    </Card>
  );
}

// Adding or editing a reminder: what, when, how often, until when, alerts
export function ReminderForm({
  account,
  reminder,
  initial,
  recordTitle,
}: {
  account: RecordAccountInfo;
  reminder?: ReminderInfo;
  initial: ReminderFormState;
  recordTitle: string | null;
}) {
  const t = useTheme();
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [alertsTouched, setAlertsTouched] = useState(Boolean(reminder));
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const save = reminder ? update : create;
  const set: Set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "alerts") setAlertsTouched(true);
    setLocalErrors({});
  };
  const chooseKind = (kind: ReminderKind) =>
    setForm((f) => ({
      ...f,
      kind,
      alerts: alertsTouched ? f.alerts : KIND_ALERTS[kind],
      repeat:
        !reminder && kind === "medicine" && f.repeat === "none"
          ? "day"
          : f.repeat,
    }));
  const error: Err = (key) => {
    if (localErrors[key]) return localErrors[key];
    const direct = fieldError(save.error, key);
    if (direct) return direct;
    const server = Object.entries(SERVER_FIELDS).find(([, v]) => v === key);
    return server ? fieldError(save.error, server[0]) : undefined;
  };

  async function submit() {
    if (!form.kind) {
      setLocalErrors({ kind: "Choose what it's for" });
      return;
    }
    const { fields, errors } = reminderFieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      const saved = reminder
        ? await update.mutateAsync({ id: reminder.id, fields })
        : await create.mutateAsync({ ownerId: account.ownerId, fields });
      if (reminder) router.back();
      else router.replace(`/reminders/${saved.id}`);
    } catch {
      // Shown from save.error
    }
  }

  const hasFieldErrors =
    Object.keys(localErrors).length > 0 ||
    Object.keys(
      (save.error as { fieldErrors?: object } | null)?.fieldErrors ?? {},
    ).length > 0;

  return (
    <Screen
      problem={
        hasFieldErrors
          ? "Please check the boxes marked in red above."
          : save.isError
            ? messageOf(save.error)
            : null
      }
      footer={
        <Buttons>
          <Button busy={save.isPending} onPress={() => void submit()}>
            {save.isPending
              ? "Saving…"
              : reminder
                ? "Save changes"
                : "Save reminder"}
          </Button>
          <Button kind="secondary" onPress={() => router.back()}>
            Cancel
          </Button>
        </Buttons>
      }
    >
      {account.role !== "owner" ? (
        <Txt muted>{account.ownerName}'s reminders</Txt>
      ) : null}
      {save.isError ? (
        <Notice tone="error">
          {hasFieldErrors
            ? "Please check the boxes marked in red."
            : messageOf(save.error)}
        </Notice>
      ) : null}

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <Txt tone="label">What is it for?</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {REMINDER_KINDS.map((kind) => {
            const Icon = REMINDER_ICONS[kind];
            const on = form.kind === kind;
            return (
              <Pressable
                key={kind}
                onPress={() => chooseKind(kind)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{
                  width: "48%",
                  flexGrow: 1,
                  minHeight: 54,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? t.brand : t.edge,
                  backgroundColor: on ? t.brandSoft : t.card,
                }}
              >
                <Icon size={20} color={t.brand} />
                <Txt
                  tone="label"
                  color={on ? t.deep : t.ink}
                  style={{ flexShrink: 1 }}
                >
                  {REMINDER_KIND_LABELS[kind]}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        {error("kind") ? (
          <Txt tone="small" color={t.danger}>
            {error("kind")}
          </Txt>
        ) : null}
      </View>

      {form.kind ? (
        <>
          <Part title="About it">
            <Select
              label="Who it's for"
              value={form.profileId}
              onChange={(v) => set("profileId", v)}
              options={account.people.map((p) => ({
                value: p.profileId ?? "",
                label: p.name,
              }))}
              error={error("profileId")}
            />
            <Field
              label={form.kind === "medicine" ? "Medicine name" : "Title"}
              value={form.title}
              onChangeText={(v) => set("title", v)}
              placeholder={PLACEHOLDERS[form.kind]}
              maxLength={REMINDER_LIMITS.title}
              error={error("title")}
            />
            {form.kind === "medicine" ? (
              <Field
                label="Dose (optional)"
                value={form.dose}
                onChangeText={(v) => set("dose", v)}
                placeholder="500 mg, 1 tablet after meals"
                maxLength={REMINDER_LIMITS.dose}
                error={error("dose")}
              />
            ) : null}
            <Field
              label="Note (optional)"
              value={form.note}
              onChangeText={(v) => set("note", v)}
              multiline
              placeholder="Bring the last lab results. Fasting 8 hours."
              maxLength={REMINDER_LIMITS.note}
              error={error("note")}
            />
            {form.recordId ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <FileText size={16} color={t.muted} />
                <Txt tone="small">
                  About the record {recordTitle ?? "this record"}
                </Txt>
                <Button kind="link" small onPress={() => set("recordId", "")}>
                  Unlink
                </Button>
              </View>
            ) : null}
          </Part>

          <Part title="When" note="Times are in Philippine time.">
            <DateField
              label={form.repeat === "none" ? "Date" : "First day"}
              value={form.start}
              onChange={(v) => set("start", v)}
              error={error("start")}
            />
            {form.kind === "medicine" ? (
              <Chips
                value={
                  PRESETS.find((p) => p.times.join() === form.times.join())
                    ?.label ?? ""
                }
                onChange={(label) =>
                  set("times", PRESETS.find((p) => p.label === label)!.times)
                }
                options={PRESETS.map((p) => ({
                  value: p.label,
                  label: p.label,
                }))}
              />
            ) : null}
            {form.times.map((time, index) => (
              <View
                key={index}
                style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
              >
                <View style={{ flex: 1 }}>
                  <DateField
                    mode="time"
                    label={form.times.length > 1 ? `Time ${index + 1}` : "Time"}
                    value={time}
                    onChange={(v) =>
                      set(
                        "times",
                        form.times.map((x, i) => (i === index ? v : x)),
                      )
                    }
                  />
                </View>
                {form.times.length > 1 ? (
                  <Pressable
                    onPress={() =>
                      set(
                        "times",
                        form.times.filter((_, i) => i !== index),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove time ${index + 1}`}
                    style={{ padding: 12 }}
                  >
                    <X size={20} color={t.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {error("times") ? (
              <Txt tone="small" color={t.danger}>
                {error("times")}
              </Txt>
            ) : null}
            <Button
              kind="secondary"
              small
              icon={Plus}
              disabled={form.times.length >= REMINDER_LIMITS.timesPerDay}
              onPress={() => set("times", [...form.times, "12:00"])}
            >
              Add a time
            </Button>
          </Part>

          <Part title="Repeat">
            <Select
              label="Repeats"
              value={form.repeat}
              onChange={(v) => set("repeat", v)}
              options={[
                { value: "none" as RepeatChoice, label: "Doesn't repeat" },
                {
                  value: "day" as RepeatChoice,
                  label: "Daily, or every few days",
                },
                {
                  value: "week" as RepeatChoice,
                  label: "Weekly, on chosen days",
                },
                { value: "month" as RepeatChoice, label: "Monthly" },
                { value: "year" as RepeatChoice, label: "Yearly" },
              ]}
            />
            {form.repeat !== "none" ? (
              <Field
                label={`Every how many ${UNITS[form.repeat][1]}`}
                keyboardType="number-pad"
                value={form.interval}
                onChangeText={(v) => set("interval", v)}
                hint={`Every ${form.interval || "…"} ${form.interval === "1" ? UNITS[form.repeat][0] : UNITS[form.repeat][1]}`}
                error={error("interval")}
              />
            ) : null}
            {form.repeat === "week" ? (
              <View style={{ gap: 6 }}>
                <Txt tone="label">On</Txt>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {WEEKDAYS.map((name, day) => {
                    const on = form.weekdays.includes(day);
                    return (
                      <Pressable
                        key={name}
                        onPress={() =>
                          set(
                            "weekdays",
                            on
                              ? form.weekdays.filter((d) => d !== day)
                              : [...form.weekdays, day].sort(),
                          )
                        }
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={WEEKDAY_NAMES[day]}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: on ? t.brand : t.edge,
                          backgroundColor: on ? t.brand : t.card,
                        }}
                      >
                        <Txt tone="small" bold color={on ? t.onBrand : t.ink}>
                          {name}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                {error("weekdays") ? (
                  <Txt tone="small" color={t.danger}>
                    {error("weekdays")}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            {form.repeat === "month" ? (
              <>
                <Chips
                  label="On"
                  value={form.monthOn}
                  onChange={(v) => set("monthOn", v)}
                  options={[
                    { value: "day", label: "A day of the month" },
                    { value: "weekday", label: "A weekday of the month" },
                  ]}
                />
                {form.monthOn === "day" ? (
                  <Field
                    label="Day (1–31)"
                    keyboardType="number-pad"
                    value={form.monthDay}
                    onChangeText={(v) => set("monthDay", v)}
                    hint="29–31: the last day in shorter months"
                    error={error("monthDay")}
                  />
                ) : (
                  <>
                    <Select
                      label="Which"
                      value={form.monthWeek}
                      onChange={(v) => set("monthWeek", v)}
                      options={[
                        { value: "1", label: "1st" },
                        { value: "2", label: "2nd" },
                        { value: "3", label: "3rd" },
                        { value: "4", label: "4th" },
                        { value: "-1", label: "Last" },
                      ]}
                    />
                    <Select
                      label="Day"
                      value={form.monthWeekday}
                      onChange={(v) => set("monthWeekday", v)}
                      options={WEEKDAY_NAMES.map((name, i) => ({
                        value: String(i),
                        label: name,
                      }))}
                    />
                  </>
                )}
              </>
            ) : null}
          </Part>

          {form.repeat !== "none" ? (
            <EndPart form={form} set={set} error={error} />
          ) : null}
          <AlertsPart form={form} set={set} error={error} />
          <Preview form={form} />
        </>
      ) : null}
    </Screen>
  );
}

function EndPart({
  form,
  set,
  error,
}: {
  form: ReminderFormState;
  set: Set;
  error: Err;
}) {
  const doses = supplyCount(form.pills, form.perDose);
  return (
    <Part title="Ends">
      <Chips
        value={form.end}
        onChange={(v) => set("end", v)}
        options={[
          { value: "never", label: "Never" },
          { value: "until", label: "On a date" },
          { value: "days", label: "After a number of days" },
          { value: "count", label: "After a number of times" },
          ...(form.kind === "medicine"
            ? [
                {
                  value: "supply" as const,
                  label: "When the medicine runs out",
                },
              ]
            : []),
        ]}
      />
      {form.end === "until" ? (
        <DateField
          label="Last day"
          value={form.until}
          onChange={(v) => set("until", v)}
          error={error("until")}
        />
      ) : null}
      {form.end === "days" ? (
        <Field
          label="For how many days"
          keyboardType="number-pad"
          value={form.days}
          onChangeText={(v) => set("days", v)}
          placeholder="7"
          error={error("days")}
        />
      ) : null}
      {form.end === "count" ? (
        <Field
          label="How many times"
          keyboardType="number-pad"
          value={form.count}
          onChangeText={(v) => set("count", v)}
          error={error("count")}
        />
      ) : null}
      {form.end === "supply" ? (
        <>
          <Field
            label="How many are left"
            keyboardType="number-pad"
            value={form.pills}
            onChangeText={(v) => set("pills", v)}
            placeholder="30"
            error={error("pills")}
          />
          <Field
            label="How many each time"
            keyboardType="number-pad"
            value={form.perDose}
            onChangeText={(v) => set("perDose", v)}
          />
          {doses !== null ? (
            <Txt
              tone="small"
              muted
            >{`That's ${doses} ${doses === 1 ? "time" : "times"}.`}</Txt>
          ) : null}
        </>
      ) : null}
    </Part>
  );
}

function AlertsPart({
  form,
  set,
  error,
}: {
  form: ReminderFormState;
  set: Set;
  error: Err;
}) {
  const t = useTheme();
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<keyof typeof UNIT_MINUTES>("hours");
  const [ownError, setOwnError] = useState<string>();
  const full = form.alerts.length >= REMINDER_LIMITS.alerts;
  const toggle = (minutes: number) =>
    set(
      "alerts",
      form.alerts.includes(minutes)
        ? form.alerts.filter((m) => m !== minutes)
        : [...form.alerts, minutes].sort((a, b) => a - b),
    );
  const addOwn = () => {
    const n = Number(amount);
    const minutes = n * UNIT_MINUTES[unit];
    if (!Number.isInteger(n) || n < 1)
      return setOwnError("Enter a whole number");
    if (minutes > REMINDER_LIMITS.alertMinutes)
      return setOwnError("At most 30 days before");
    setOwnError(undefined);
    setAmount("");
    if (!form.alerts.includes(minutes))
      set(
        "alerts",
        [...form.alerts, minutes].sort((a, b) => a - b),
      );
  };
  const own = form.alerts.filter(
    (m) => !(ALERT_PRESETS as readonly number[]).includes(m),
  );
  return (
    <Part
      title="Alerts"
      note={`On your phone and by email, to you and the family it's shared with. Each person can turn them off for themselves. Up to ${REMINDER_LIMITS.alerts}.`}
    >
      {ALERT_PRESETS.map((minutes) => (
        <CheckRow
          key={minutes}
          label={describeAlert(minutes)}
          value={form.alerts.includes(minutes)}
          onChange={() =>
            full && !form.alerts.includes(minutes) ? undefined : toggle(minutes)
          }
        />
      ))}
      {own.map((minutes) => (
        <View
          key={minutes}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Txt style={{ flex: 1 }}>{describeAlert(minutes)}</Txt>
          <Pressable
            onPress={() => toggle(minutes)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${describeAlert(minutes)}`}
            style={{ padding: 8 }}
          >
            <X size={18} color={t.muted} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Your own"
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!full}
            error={ownError}
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Select
            label="Unit"
            value={unit}
            onChange={setUnit}
            options={[
              { value: "minutes" as const, label: "minutes before" },
              { value: "hours" as const, label: "hours before" },
              { value: "days" as const, label: "days before" },
            ]}
          />
        </View>
      </View>
      <Button
        kind="secondary"
        small
        icon={Plus}
        disabled={full || !amount}
        onPress={addOwn}
      >
        Add
      </Button>
      {form.alerts.length === 0 ? (
        <Txt tone="small" muted>
          No alerts: it only shows in Talaan.
        </Txt>
      ) : null}
      {error("alerts") ? (
        <Txt tone="small" color={t.danger}>
          {error("alerts")}
        </Txt>
      ) : null}
    </Part>
  );
}

// The schedule in words and its next few times, as you fill the form in
function Preview({ form }: { form: ReminderFormState }) {
  const t = useTheme();
  const { fields } = reminderFieldsFromForm({
    ...form,
    kind: form.kind || "other",
  });
  const parsed = fields ? scheduleSchema.safeParse(fields.schedule) : null;
  if (!parsed?.success) return null;
  const next = nextOccurrences(parsed.data, new Date(), 5);
  return (
    <Card tone="soft">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <CalendarClock size={18} color={t.deep} />
        <Txt bold style={{ flex: 1 }}>
          {describeSchedule(parsed.data)}
        </Txt>
      </View>
      {next.length > 0 ? (
        next.map((at) => (
          <Txt key={at.toISOString()} tone="small">
            • {whenText(at)}
          </Txt>
        ))
      ) : (
        <Txt tone="small" muted>
          No times left from now.
        </Txt>
      )}
    </Card>
  );
}
