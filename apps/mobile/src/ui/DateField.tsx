import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Clock } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Txt } from "./kit";
import {
  fromDateValue,
  fromTimeValue,
  showDate,
  showTime,
  toDateValue,
  toTimeValue,
} from "./dateValues";

// A date (YYYY-MM-DD) or a time (HH:MM), shown as month/day/year and
// 9:30 AM, picked with the phone's own calendar or clock
export function DateField({
  label,
  value,
  onChange,
  error,
  mode = "date",
  optional,
  maximumToday,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  mode?: "date" | "time";
  // Can be cleared
  optional?: boolean;
  // Not after today (a record's date, a birthday)
  maximumToday?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = mode === "date" ? Calendar : Clock;
  const shown = value
    ? mode === "date"
      ? showDate(value)
      : showTime(value)
    : mode === "date"
      ? "mm/dd/yyyy"
      : "Choose a time";
  const current = mode === "date" ? toDateValue(value) : toTimeValue(value);
  return (
    <View style={{ gap: 6 }}>
      <Txt tone="label">{label}</Txt>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? shown : "not set"}`}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: error ? t.danger : t.edge,
            backgroundColor: t.card,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon size={18} color={t.muted} />
          <Txt muted={!value}>{shown}</Txt>
        </Pressable>
        {optional && value ? (
          <Button kind="link" small onPress={() => onChange("")}>
            Clear
          </Button>
        ) : null}
      </View>
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
      {open ? (
        <DateTimePicker
          value={current}
          mode={mode}
          display={Platform.OS === "ios" ? "inline" : "default"}
          maximumDate={maximumToday ? new Date() : undefined}
          onChange={(event, date) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (event.type === "dismissed" || !date) {
              setOpen(false);
              return;
            }
            onChange(
              mode === "date" ? fromDateValue(date) : fromTimeValue(date),
            );
          }}
        />
      ) : null}
      {open && Platform.OS === "ios" ? (
        <Button kind="secondary" small onPress={() => setOpen(false)}>
          Done
        </Button>
      ) : null}
    </View>
  );
}
