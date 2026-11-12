import { labFlag, type RecordInfo } from "@talaan/shared";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Txt } from "../ui/kit";

// A lab record's results, each with its normal range and Low or High
export function LabResults({
  record,
}: {
  record: RecordInfo & { type: "lab" };
}) {
  const t = useTheme();
  return (
    <Card>
      <Txt tone="heading">Results</Txt>
      {record.details.results.map((r, i) => {
        const flag = labFlag(r);
        const out = flag === "low" || flag === "high";
        const range =
          r.rangeLow !== null || r.rangeHigh !== null
            ? `Normal ${r.rangeLow ?? ""}–${r.rangeHigh ?? ""}`
            : "";
        return (
          <View
            key={`${r.name}-${i}`}
            accessible
            accessibilityLabel={`${r.name}, ${r.value} ${r.unit}${out ? `, ${flag}` : ""}${range ? `, ${range}` : ""}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              paddingVertical: 8,
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: t.edge,
            }}
          >
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "600" }}>{r.name}</Txt>
              {range ? (
                <Txt tone="small" muted>
                  {range}
                </Txt>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Txt style={{ fontWeight: "700" }} color={out ? t.danger : t.ink}>
                {r.value} {r.unit}
              </Txt>
              {out && (
                <Txt
                  tone="small"
                  color={t.danger}
                  style={{ fontWeight: "700" }}
                >
                  {flag === "low" ? "Low" : "High"}
                </Txt>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export function Medicines({
  record,
}: {
  record: RecordInfo & { type: "prescription" };
}) {
  return (
    <Card>
      <Txt tone="heading">Medicines</Txt>
      {record.details.medicines.map((m, i) => (
        <View key={`${m.name}-${i}`}>
          <Txt style={{ fontWeight: "600" }}>
            {m.name}
            {m.dose ? `, ${m.dose}` : ""}
          </Txt>
          {m.frequency ? (
            <Txt tone="small" muted>
              {m.frequency}
            </Txt>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
