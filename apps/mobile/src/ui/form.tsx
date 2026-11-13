import { Check, ChevronDown, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Switch,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Buttons, Card, Txt } from "./kit";

// Form pieces, the same boxes and rules as the website's forms

export function Field({
  label,
  error,
  hint,
  multiline,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt tone="label">{label}</Txt>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={t.muted}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 110 : 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? t.danger : t.edge,
          backgroundColor: t.card,
          color: t.ink,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          fontSize: 17 * t.scale,
        }}
      />
      {hint && !error ? (
        <Txt tone="tiny" muted>
          {hint}
        </Txt>
      ) : null}
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

export interface Option<V extends string> {
  value: V;
  label: string;
}

// A few choices side by side (wrapping): like the website's buttons groups
export function Chips<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label?: string;
  options: Option<V>[];
  value: V;
  onChange: (value: V) => void;
  error?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup">
      {label ? <Txt tone="label">{label}</Txt> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{
                minHeight: 40,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: on ? 2 : 1,
                borderColor: on ? t.brand : t.edge,
                backgroundColor: on ? t.brandSoft : t.card,
              }}
            >
              <Txt tone="label" color={on ? t.deep : t.ink}>
                {o.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

// A long list of choices: a box that opens a list (like a <select>)
export function Select<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "Choose…",
}: {
  label: string;
  options: Option<V>[];
  value: V;
  onChange: (value: V) => void;
  error?: string;
  placeholder?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <Txt tone="label">{label}</Txt>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${chosen?.label ?? placeholder}`}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? t.danger : t.edge,
          backgroundColor: t.card,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Txt style={{ flex: 1 }} muted={!chosen} numberOfLines={1}>
          {chosen?.label ?? placeholder}
        </Txt>
        <ChevronDown size={18} color={t.muted} />
      </Pressable>
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: t.page }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              gap: 8,
              borderBottomWidth: 1,
              borderColor: t.edge,
              backgroundColor: t.card,
            }}
          >
            <Txt tone="heading" style={{ flex: 1 }}>
              {label}
            </Txt>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ padding: 8 }}
            >
              <X size={22} color={t.ink} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value || "(none)"}
            renderItem={({ item }) => {
              const on = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 52,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderColor: t.edge,
                    backgroundColor: on ? t.brandSoft : t.card,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Txt style={{ flex: 1 }} bold={on}>
                    {item.label}
                  </Txt>
                  {on ? <Check size={20} color={t.brand} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// On or off, with a sentence about what it does
export function Toggle({
  label,
  value,
  onChange,
  note,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  note?: string;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt tone="label">{label}</Txt>
        {note ? (
          <Txt tone="small" muted>
            {note}
          </Txt>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: t.brand, false: t.edge }}
        thumbColor={t.card}
      />
    </Pressable>
  );
}

// A tick box with its sentence
export function CheckRow({
  label,
  value,
  onChange,
  note,
  children,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  note?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: value ? t.brand : t.muted,
          backgroundColor: value ? t.brand : t.card,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {value ? <Check size={18} color={t.onBrand} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt>{label}</Txt>
        {note ? (
          <Txt tone="small" muted>
            {note}
          </Txt>
        ) : null}
        {children}
      </View>
    </Pressable>
  );
}

// "Are you sure?" inside the screen (like the website): the action and Keep it
export function ConfirmBox({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
  cancelLabel = "Keep it",
  children,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  cancelLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Card tone="danger">
      <Txt bold>{message}</Txt>
      {children}
      <Buttons>
        <Button kind="danger" onPress={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
        <Button kind="secondary" onPress={onCancel}>
          {cancelLabel}
        </Button>
      </Buttons>
    </Card>
  );
}
