import { moveItem } from "@talaan/client";
import { ArrowDown, ArrowUp, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Field, Select } from "./form";
import { Button } from "./kit";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "select";
  options?: { value: string; label: string }[];
  numeric?: boolean;
}

// Rows to add, change, remove (and reorder): allergies, contacts… (the
// website's list editor)
export function ListEditor<T extends Record<string, string>>({
  itemLabel,
  items,
  onChange,
  columns,
  empty,
  addLabel,
  max,
  error,
  reorder = false,
}: {
  itemLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  columns: Column<T>[];
  empty: T;
  addLabel: string;
  max: number;
  error: (key: string) => string | undefined;
  reorder?: boolean;
}) {
  const t = useTheme();
  const set = (index: number, key: keyof T, value: string) =>
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            borderWidth: 1,
            borderColor: t.edge,
            borderRadius: 12,
            padding: 12,
            gap: 10,
          }}
        >
          {columns.map((column) =>
            column.type === "select" ? (
              <Select
                key={column.key}
                label={column.label}
                value={item[column.key]}
                onChange={(v) => set(index, column.key, v)}
                options={column.options ?? []}
                error={error(`${index}.${column.key}`)}
              />
            ) : (
              <Field
                key={column.key}
                label={column.label}
                value={item[column.key]}
                onChangeText={(v) => set(index, column.key, v)}
                placeholder={index === 0 ? column.placeholder : undefined}
                keyboardType={
                  column.type === "tel"
                    ? "phone-pad"
                    : column.numeric
                      ? "number-pad"
                      : "default"
                }
                autoComplete={column.type === "tel" ? "tel" : undefined}
                error={error(`${index}.${column.key}`)}
              />
            ),
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {reorder && items.length > 1 ? (
              <>
                <Pressable
                  disabled={index === 0}
                  onPress={() => onChange(moveItem(items, index, -1))}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${itemLabel} ${index + 1} up`}
                  style={{ padding: 8, opacity: index === 0 ? 0.3 : 1 }}
                >
                  <ArrowUp size={20} color={t.ink} />
                </Pressable>
                <Pressable
                  disabled={index === items.length - 1}
                  onPress={() => onChange(moveItem(items, index, 1))}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${itemLabel} ${index + 1} down`}
                  style={{
                    padding: 8,
                    opacity: index === items.length - 1 ? 0.3 : 1,
                  }}
                >
                  <ArrowDown size={20} color={t.ink} />
                </Pressable>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            <Button
              kind="link"
              small
              label={`Remove ${itemLabel} ${index + 1}`}
              onPress={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </View>
        </View>
      ))}
      <Button
        kind="secondary"
        small
        icon={Plus}
        disabled={items.length >= max}
        onPress={() => onChange([...items, { ...empty }])}
      >
        {addLabel}
      </Button>
    </View>
  );
}
