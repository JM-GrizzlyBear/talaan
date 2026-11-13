import { auditSentence, changeText, shortDateTime } from "@talaan/client";
import {
  type AuditEntryInfo,
  formatRange,
  labFlag,
  type LabFlag,
  type LabResult,
  type Medicine,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Badge, List, Row, Section, Txt } from "../ui/kit";

// "Low" / "High" in red, like the website
export function LabFlagBadge({ flag }: { flag: LabFlag }) {
  if (!flag) return null;
  return <Badge tone="danger">{flag === "low" ? "Low" : "High"}</Badge>;
}

// Lab results: test, result (Low/High marked), normal range
export function LabTable({ results }: { results: LabResult[] }) {
  const t = useTheme();
  return (
    <Section title="Results">
      <List>
        {results.map((row, i) => {
          const flag = labFlag(row);
          return (
            <View
              key={i}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: t.edge,
                backgroundColor: flag ? t.dangerSoft : t.card,
                gap: 2,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Txt bold style={{ flex: 1 }}>
                  {row.name}
                </Txt>
                <LabFlagBadge flag={flag} />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Txt color={flag ? t.danger : t.ink} bold={Boolean(flag)}>
                  {row.value}
                  {row.unit ? ` ${row.unit}` : ""}
                </Txt>
                <Txt tone="small" muted>
                  Normal: {formatRange(row) || "—"}
                </Txt>
              </View>
            </View>
          );
        })}
      </List>
    </Section>
  );
}

export function MedicinesList({ medicines }: { medicines: Medicine[] }) {
  return (
    <Section title="Medicines">
      <List>
        {medicines.map((m, i) => (
          <Row
            key={i}
            first={i === 0}
            title={m.name}
            subtitle={
              [m.dose, m.frequency].filter(Boolean).join(" · ") ||
              "No dose written"
            }
          />
        ))}
      </List>
    </Section>
  );
}

export function TextBlock({ title, text }: { title: string; text: string }) {
  const t = useTheme();
  return (
    <Section title={title}>
      <View
        style={{
          backgroundColor: t.card,
          borderColor: t.edge,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Txt selectable>{text}</Txt>
      </View>
    </Section>
  );
}

const LINKED = ["record.created", "record.edited", "record.restored"];

// Who did what, when, and exactly what changed (newest first)
export function HistoryList({
  entries,
  linkRecords = false,
}: {
  entries: AuditEntryInfo[];
  // On Activity, entries open their record
  linkRecords?: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  return (
    <List>
      {entries.map((entry, i) => {
        const link =
          linkRecords && entry.recordId && LINKED.includes(entry.action);
        const body = (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: t.edge,
              gap: 4,
            }}
          >
            <Txt tone="small" muted>
              {shortDateTime(entry.at)}
            </Txt>
            <Txt style={{ fontWeight: "600" }} color={link ? t.brand : t.ink}>
              {auditSentence(entry)}
            </Txt>
            {entry.changes.length > 0 && (
              <View
                style={{
                  borderLeftWidth: 2,
                  borderColor: t.brandSoft,
                  paddingLeft: 10,
                  gap: 2,
                }}
              >
                {entry.changes.map((change, j) => (
                  <Txt key={j} tone="small">
                    {changeText(change, entry.action)}
                  </Txt>
                ))}
              </View>
            )}
          </View>
        );
        return link ? (
          <Pressable
            key={entry.id}
            onPress={() => router.push(`/records/${entry.recordId}`)}
            accessibilityRole="link"
          >
            {body}
          </Pressable>
        ) : (
          <View key={entry.id}>{body}</View>
        );
      })}
    </List>
  );
}
