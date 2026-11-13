import { columnsFor, dateLabel, type LabFilters } from "@talaan/client";
import {
  formatRange,
  LAB_GROUPS,
  type LabGroup,
  type LabRecordResults,
  type LabSeries,
  labStats,
  needsAttention,
  roundLab,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { CheckRow, Field, Select } from "../ui/form";
import { Card, Facts, List, Txt } from "../ui/kit";
import { LabChart, ResultCell, TrendArrow } from "./LabParts";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function LabFiltersBar({
  filters,
  onChange,
}: {
  filters: LabFilters;
  onChange: (f: LabFilters) => void;
}) {
  const set = <K extends keyof LabFilters>(key: K, value: LabFilters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Find a test"
        value={filters.search}
        onChangeText={(v) => set("search", v)}
        placeholder="Hemoglobin, FBS, SGPT…"
      />
      <Select
        label="Group"
        value={filters.group}
        onChange={(v) => set("group", v as LabGroup | "")}
        options={[
          { value: "", label: "All groups" },
          ...LAB_GROUPS.map((g) => ({ value: g, label: g })),
        ]}
      />
      <Select
        label="Results from"
        value={String(filters.years)}
        onChange={(v) => set("years", Number(v))}
        options={[
          { value: "0", label: "All years" },
          { value: "1", label: "The last year" },
          { value: "2", label: "The last 2 years" },
          { value: "5", label: "The last 5 years" },
        ]}
      />
      <CheckRow
        label="Only tests with a result outside the normal range"
        value={filters.onlyOut}
        onChange={(v) => set("onlyOut", v)}
      />
    </View>
  );
}

const NAME_W = 150;
const COL_W = 110;

// Tests down the side, lab dates across (newest first); the names stay put
// while the dates scroll sideways
export function LabTable({
  series,
  columns,
  highlight,
  onTest,
}: {
  series: LabSeries[];
  columns: LabRecordResults[];
  highlight?: string;
  onTest: (key: string) => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const rows: ({ group: string } | { s: LabSeries })[] = [];
  series.forEach((s, i) => {
    if (i === 0 || series[i - 1].group !== s.group)
      rows.push({ group: s.group });
    rows.push({ s });
  });
  const cell = {
    minHeight: 52,
    justifyContent: "center" as const,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: t.edge,
  };
  const head = {
    height: 56,
    justifyContent: "flex-end" as const,
    paddingHorizontal: 8,
    paddingBottom: 6,
  };
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: t.edge,
        borderRadius: 14,
        backgroundColor: t.card,
        overflow: "hidden",
      }}
    >
      <View style={{ width: NAME_W, borderRightWidth: 1, borderColor: t.edge }}>
        <View style={[head, { backgroundColor: t.page }]}>
          <Txt tone="small" muted bold>
            Test
          </Txt>
        </View>
        {rows.map((r, i) =>
          "group" in r ? (
            <View
              key={`g${i}`}
              style={[cell, { minHeight: 32, backgroundColor: t.page }]}
            >
              <Txt tone="tiny" bold muted>
                {r.group}
              </Txt>
            </View>
          ) : (
            <Pressable
              key={r.s.key}
              disabled={!r.s.numeric}
              onPress={() => onTest(r.s.key)}
              accessibilityRole={r.s.numeric ? "button" : undefined}
              style={cell}
            >
              <Txt
                tone="small"
                bold
                color={r.s.numeric ? t.brand : t.ink}
                numberOfLines={2}
              >
                {r.s.name}
              </Txt>
              <Txt tone="tiny" muted numberOfLines={1}>
                {[
                  r.s.unit,
                  r.s.points.at(-1) ? formatRange(r.s.points.at(-1)!) : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Txt>
            </Pressable>
          ),
        )}
      </View>
      <ScrollView horizontal>
        <View>
          <View style={{ flexDirection: "row", backgroundColor: t.page }}>
            {columns.map((c) => (
              <Pressable
                key={c.recordId}
                onPress={() => router.push(`/records/${c.recordId}`)}
                accessibilityRole="link"
                style={[
                  head,
                  {
                    width: COL_W,
                    backgroundColor:
                      highlight === c.recordId ? t.brandSoft : undefined,
                  },
                ]}
              >
                <Txt tone="small" bold color={t.brand}>
                  {dateLabel(c.date)}
                </Txt>
                {c.facility ? (
                  <Txt tone="tiny" muted numberOfLines={1}>
                    {c.facility}
                  </Txt>
                ) : null}
              </Pressable>
            ))}
          </View>
          {rows.map((r, i) =>
            "group" in r ? (
              <View
                key={`g${i}`}
                style={[cell, { minHeight: 32, backgroundColor: t.page }]}
              />
            ) : (
              <View key={r.s.key} style={{ flexDirection: "row" }}>
                {columns.map((c) => {
                  const index = r.s.points.findIndex(
                    (p) => p.recordId === c.recordId,
                  );
                  const point = index === -1 ? undefined : r.s.points[index];
                  return (
                    <View
                      key={c.recordId}
                      style={[
                        cell,
                        {
                          width: COL_W,
                          backgroundColor:
                            highlight === c.recordId ? t.brandSoft : undefined,
                        },
                      ]}
                    >
                      {point ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <ResultCell point={point} unit={r.s.unit} />
                          <TrendArrow
                            point={point}
                            previous={index ? r.s.points[index - 1] : undefined}
                          />
                        </View>
                      ) : (
                        <Txt muted accessibilityLabel="Not done">
                          —
                        </Txt>
                      )}
                    </View>
                  );
                })}
              </View>
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function ChartsGrid({
  series,
  onTest,
  highlight,
}: {
  series: LabSeries[];
  onTest: (key: string) => void;
  highlight?: string;
}) {
  const charted = series.filter((s) => s.numeric);
  if (charted.length === 0) {
    return (
      <Txt muted>
        No results with numbers to chart. Word results like “Negative” are in
        the table.
      </Txt>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {charted.map((s) => {
        const latest = s.points.at(-1)!;
        return (
          <Card
            key={s.key}
            onPress={() => onTest(s.key)}
            label={`${s.name}: open its chart and history`}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Txt bold style={{ flex: 1 }}>
                {s.name}
              </Txt>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <ResultCell point={latest} unit={s.unit} />
                <TrendArrow point={latest} previous={s.points.at(-2)} />
              </View>
            </View>
            <Txt tone="small" muted>
              {s.unit}
              {formatRange(latest)
                ? ` · normal ${formatRange(latest)}`
                : ""} · {s.points.length}{" "}
              {s.points.length === 1 ? "result" : "results"}, latest{" "}
              {dateLabel(latest.date)}
            </Txt>
            <LabChart series={s} highlight={highlight} />
          </Card>
        );
      })}
    </View>
  );
}

const outInARow = (s: LabSeries) => {
  let count = 0;
  for (let i = s.points.length - 1; i >= 0 && s.points[i].flag; i--) count++;
  return count;
};

export function NeedsAttention({
  series,
  onTest,
}: {
  series: LabSeries[];
  onTest: (key: string) => void;
}) {
  const t = useTheme();
  const list = needsAttention(series);
  if (list.length === 0) {
    return (
      <Card>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <CircleCheck size={20} color={t.brand} />
          <Txt style={{ flex: 1 }}>
            Every latest result is within its normal range.
          </Txt>
        </View>
      </Card>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <Txt tone="small" muted>
        Talaan compares each result with the range printed on it. Only a doctor
        can say what a result means for you.
      </Txt>
      {list.map((s) => {
        const latest = s.points.at(-1)!;
        const row = outInARow(s);
        return (
          <Card
            key={s.key}
            tone="danger"
            onPress={s.numeric ? () => onTest(s.key) : undefined}
            label={s.name}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Txt bold>{s.name}</Txt>
              <ResultCell point={latest} unit={s.unit} />
              <Txt tone="small" muted>
                {s.unit}
              </Txt>
              <TrendArrow point={latest} previous={s.points.at(-2)} />
            </View>
            <Txt tone="small" muted>
              {formatRange(latest) ? `Normal ${formatRange(latest)} · ` : ""}
              {dateLabel(latest.date)}
              {row > 1 ? ` · out of range ${row} times in a row` : ""}
            </Txt>
            {s.numeric && s.points.length > 1 ? <LabChart series={s} /> : null}
          </Card>
        );
      })}
    </View>
  );
}

export function CompareDates({
  series,
  columns,
}: {
  series: LabSeries[];
  columns: LabRecordResults[];
}) {
  const t = useTheme();
  const [before, setBefore] = useState(columns[1]?.recordId ?? "");
  const [after, setAfter] = useState(columns[0]?.recordId ?? "");
  if (columns.length < 2)
    return (
      <Txt muted>Comparing needs at least two lab records for this person.</Txt>
    );
  const options = columns.map((c) => ({
    value: c.recordId,
    label: `${dateLabel(c.date)}${c.facility ? ` · ${c.facility}` : ""}`,
  }));
  const rows = series
    .map((s) => ({
      s,
      a: s.points.find((p) => p.recordId === before),
      b: s.points.find((p) => p.recordId === after),
    }))
    .filter((r) => r.a || r.b);
  return (
    <View style={{ gap: 12 }}>
      <Select
        label="Before"
        value={before}
        onChange={setBefore}
        options={options}
      />
      <Select
        label="After"
        value={after}
        onChange={setAfter}
        options={options}
      />
      <List>
        {rows.map(({ s, a, b }, i) => {
          const change =
            a?.value != null && b?.value != null && !a.otherUnit && !b.otherUnit
              ? roundLab(b.value - a.value)
              : null;
          const percent =
            change !== null && a?.value
              ? Math.round((change / a.value) * 1000) / 10
              : null;
          const note =
            a && b && !a.flag && b.flag
              ? `Now ${b.flag}`
              : a && b && a.flag && !b.flag
                ? "Back to normal"
                : "";
          return (
            <View
              key={s.key}
              style={{
                padding: 12,
                gap: 6,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: t.edge,
              }}
            >
              <Txt bold>
                {s.name}
                {s.unit ? <Txt tone="small" muted>{` · ${s.unit}`}</Txt> : null}
              </Txt>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <View style={{ gap: 2 }}>
                  <Txt tone="tiny" muted>
                    Before
                  </Txt>
                  {a ? <ResultCell point={a} unit={s.unit} /> : <Txt>—</Txt>}
                </View>
                <View style={{ gap: 2 }}>
                  <Txt tone="tiny" muted>
                    After
                  </Txt>
                  {b ? <ResultCell point={b} unit={s.unit} /> : <Txt>—</Txt>}
                </View>
                <View style={{ gap: 2 }}>
                  <Txt tone="tiny" muted>
                    Change
                  </Txt>
                  <Txt>
                    {change === null
                      ? "—"
                      : `${signed(change)}${percent !== null ? ` (${signed(percent)}%)` : ""}`}
                  </Txt>
                </View>
              </View>
              {note ? (
                <Txt
                  tone="small"
                  bold
                  color={note === "Back to normal" ? t.brand : t.danger}
                >
                  {note}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </List>
    </View>
  );
}

export function TestDetail({
  series,
  highlight,
}: {
  series: LabSeries;
  highlight?: string;
}) {
  const t = useTheme();
  const router = useRouter();
  const stats = labStats(series);
  const unit = series.unit ? ` ${series.unit}` : "";
  const facts: [string, string][] = stats
    ? [
        ["Latest", `${stats.latest.shown}${unit}`],
        [
          "Change since the one before",
          stats.change === null
            ? "—"
            : `${signed(stats.change)}${unit}${stats.changePercent !== null ? ` (${signed(stats.changePercent)}%)` : ""}`,
        ],
        ["Lowest", stats.lowest === null ? "—" : `${stats.lowest}${unit}`],
        ["Highest", stats.highest === null ? "—" : `${stats.highest}${unit}`],
        ["Average", stats.average === null ? "—" : `${stats.average}${unit}`],
        [
          "Outside the normal range",
          `${stats.timesOutOfRange} of ${series.points.length}`,
        ],
      ]
    : [];
  const all = [...series.points].reverse();
  return (
    <View style={{ gap: 14 }}>
      {series.numeric ? (
        <Card>
          <LabChart series={series} size="large" highlight={highlight} />
          <Txt tone="tiny" muted>
            Shaded: the normal range of the latest result. Red: outside it.
            Hollow: results like “&lt;0.5”.
          </Txt>
        </Card>
      ) : null}
      <Card>
        <Facts rows={facts} />
      </Card>
      <List>
        {all.map((point, i) => (
          <Pressable
            key={`${point.recordId}-${i}`}
            onPress={() => router.push(`/records/${point.recordId}`)}
            accessibilityRole="link"
            style={{
              padding: 12,
              gap: 4,
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: t.edge,
              backgroundColor:
                highlight === point.recordId ? t.brandSoft : t.card,
            }}
          >
            <Txt bold color={t.brand}>
              {dateLabel(point.date)}
              {point.facility ? (
                <Txt tone="small" muted>{` · ${point.facility}`}</Txt>
              ) : null}
            </Txt>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <ResultCell point={point} unit={series.unit} explain />
              <TrendArrow point={point} previous={all[i + 1]} />
              <Txt tone="small" muted>
                {formatRange(point) ? `normal ${formatRange(point)}` : ""}
              </Txt>
            </View>
          </Pressable>
        ))}
      </List>
    </View>
  );
}

export { columnsFor };
