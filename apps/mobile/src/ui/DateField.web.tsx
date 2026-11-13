import { View } from "react-native";
import { Field } from "./form";
import { Button } from "./kit";

// The web preview (screenshots only): typed as YYYY-MM-DD or HH:MM
export function DateField({
  label,
  value,
  onChange,
  error,
  mode = "date",
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  mode?: "date" | "time";
  optional?: boolean;
  maximumToday?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:MM"}
        error={error}
      />
      {optional && value ? (
        <Button kind="link" small onPress={() => onChange("")}>
          Clear
        </Button>
      ) : null}
    </View>
  );
}
