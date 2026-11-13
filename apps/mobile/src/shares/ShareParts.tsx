import { type Expiry, expiryDate, localInputValue } from "@talaan/client";
import {
  DURATION_UNITS,
  type DurationUnit,
  SHARE_DURATIONS,
  SHARE_LIMITS,
  SHARE_STATUS_LABELS,
  type ShareStatus,
} from "@talaan/shared";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Share, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { DateField } from "../ui/DateField";
import { CheckRow, Chips, Field, Select } from "../ui/form";
import { Badge, Button, Buttons, Card, Txt } from "../ui/kit";
import { QrCode } from "../ui/QrCode";
import { newPin } from "./pin";

export function ShareStatusBadge({ status }: { status: ShareStatus }) {
  const tone =
    status === "open"
      ? "brand"
      : status === "used"
        ? "warn"
        : status === "stopped"
          ? "danger"
          : "muted";
  return <Badge tone={tone}>{SHARE_STATUS_LABELS[status]}</Badge>;
}

const endText = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

// How long the link lasts: one tap (1 hour to 30 days), any number of
// hours/days/weeks, or until a date and time
export function ExpiryPicker({
  value,
  onChange,
  now,
}: {
  value: Expiry;
  onChange: (v: Expiry) => void;
  now: Date;
}) {
  const t = useTheme();
  const result = expiryDate(value, now);
  const mode = value.mode === "preset" ? value.key : value.mode;
  const [date, time] =
    value.mode === "date" ? value.value.split("T") : ["", ""];
  return (
    <View style={{ gap: 10 }}>
      <Chips
        label="How long it works"
        value={mode}
        onChange={(v) => {
          if (v === "length")
            onChange({ mode: "length", amount: "3", unit: "days" });
          else if (v === "date")
            onChange({
              mode: "date",
              value: localInputValue(
                new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
              ),
            });
          else onChange({ mode: "preset", key: v });
        }}
        options={[
          ...SHARE_DURATIONS.map((d) => ({ value: d.key, label: d.label })),
          { value: "length", label: "Other length" },
          { value: "date", label: "Until a date" },
        ]}
      />
      {value.mode === "length" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Number"
              keyboardType="number-pad"
              value={value.amount}
              onChangeText={(amount) => onChange({ ...value, amount })}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Select
              label="Hours, days or weeks"
              value={value.unit}
              onChange={(unit) =>
                onChange({ ...value, unit: unit as DurationUnit })
              }
              options={Object.entries(DURATION_UNITS).map(([key, unit]) => ({
                value: key as DurationUnit,
                label: unit.label,
              }))}
            />
          </View>
        </View>
      ) : null}
      {value.mode === "date" ? (
        <>
          <DateField
            label="Ends on"
            value={date}
            onChange={(d) =>
              onChange({ mode: "date", value: `${d}T${time || "17:00"}` })
            }
          />
          <DateField
            label="At"
            mode="time"
            value={time}
            onChange={(tm) =>
              onChange({ mode: "date", value: `${date}T${tm}` })
            }
          />
        </>
      ) : null}
      <Txt
        tone="small"
        color={"error" in result ? t.danger : t.muted}
        bold={"error" in result}
      >
        {"error" in result
          ? result.error
          : `Stops working ${endText(result.at)}. You can stop it sooner.`}
      </Txt>
    </View>
  );
}

export function MaxViewsField({
  on,
  value,
  onChange,
  error,
}: {
  on: boolean;
  value: string;
  onChange: (on: boolean, value: string) => void;
  error?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <CheckRow
        label="Limit how many devices can open it"
        note="A device that opened it can keep looking until the link ends."
        value={on}
        onChange={(checked) => onChange(checked, value)}
      />
      {on ? (
        <Field
          label={`Devices (1 to ${SHARE_LIMITS.maxViews})`}
          keyboardType="number-pad"
          value={value}
          onChangeText={(v) => onChange(true, v)}
          error={error}
        />
      ) : null}
    </View>
  );
}

export function PinChoice({
  on,
  pin,
  onChange,
  error,
}: {
  on: boolean;
  pin: string;
  onChange: (on: boolean, pin: string) => void;
  error?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <CheckRow
        label="Ask for a PIN"
        note="Tell the PIN yourself (say it, or send it separately), so a forwarded link alone isn't enough."
        value={on}
        onChange={(checked) => onChange(checked, pin || newPin())}
      />
      {on ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field
              label="PIN (6 digits)"
              keyboardType="number-pad"
              maxLength={6}
              value={pin}
              onChangeText={(v) => onChange(true, v.replace(/\D/g, ""))}
              error={error}
            />
          </View>
          <Button
            kind="secondary"
            small
            icon={RefreshCw}
            onPress={() => onChange(true, newPin())}
          >
            New PIN
          </Button>
        </View>
      ) : null}
    </View>
  );
}

// The link to give the doctor: copy it, send it with the phone's share
// sheet, or let them scan the QR from this screen
export function LinkBox({
  url,
  recipient,
  pin,
}: {
  url: string;
  recipient: string;
  pin?: string;
}) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <View style={{ alignItems: "center" }}>
        <QrCode
          text={url}
          size={220}
          label={`QR code of the link for ${recipient}`}
        />
      </View>
      <Txt tone="small" muted selectable>
        {url}
      </Txt>
      <Buttons>
        <Button
          small
          icon={copied ? Check : Copy}
          onPress={async () => {
            await Clipboard.setStringAsync(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
        >
          {copied ? "Copied" : "Copy the link"}
        </Button>
        <Button
          kind="secondary"
          small
          icon={Share2}
          onPress={() =>
            void Share.share({
              message: url,
              url,
              title: `Health records for ${recipient}`,
            }).catch(() => {})
          }
        >
          Send…
        </Button>
      </Buttons>
      {pin ? (
        <View
          style={{
            backgroundColor: t.warnSoft,
            borderRadius: 10,
            padding: 10,
            gap: 4,
          }}
        >
          <Txt>
            The PIN is{" "}
            <Txt bold style={{ letterSpacing: 3, fontSize: 20 }}>
              {pin}
            </Txt>
          </Txt>
          <Txt tone="small" color={t.warn}>
            Write it down or tell it now: Talaan doesn't keep it readable, so it
            won't show again. You can set a new one below.
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}
