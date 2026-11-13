import { chartDescription, dateLabel } from "@talaan/client";
import type { LabPoint, LabSeries } from "@talaan/shared";
import { ArrowDown, ArrowUp, Minus } from "lucide-react-native";
import { View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { LabFlagBadge } from "../records/RecordParts";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "../ui/kit";
import { CHART_SIZES, chartShapes } from "./chartGeometry";

// A test's results over time: the line, the normal range shaded, points
// outside it in red ("<0.5"-style results hollow)
export function LabChart({
  series,
  size = "small",
  highlight,
}: {
  series: LabSeries;
  size?: keyof typeof CHART_SIZES;
  highlight?: string;
}) {
  const t = useTheme();
  const s = chartShapes(series, size, highlight);
  if (!s) return null;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={chartDescription(series)}
    >
      <Svg
        viewBox={`0 0 ${s.width} ${s.height}`}
        width="100%"
        height={undefined}
        style={{ aspectRatio: s.width / s.height }}
      >
        {s.band ? <Rect {...s.band} fill={t.brandSoft} /> : null}
        {s.ticks.map((tick) => (
          <G key={tick.label}>
            <Line
              x1={tick.x1}
              x2={tick.x2}
              y1={tick.y}
              y2={tick.y}
              stroke={t.edge}
              strokeDasharray="3 3"
            />
            <SvgText
              x={tick.x1 - 8}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={12}
              fill={t.muted}
            >
              {tick.label}
            </SvgText>
          </G>
        ))}
        {s.months.map((m) => (
          <SvgText
            key={m.label + m.anchor}
            x={m.x}
            y={m.y}
            textAnchor={m.anchor}
            fontSize={12}
            fill={t.muted}
          >
            {m.label}
          </SvgText>
        ))}
        <Path
          d={s.line}
          fill="none"
          stroke={t.brand}
          strokeWidth={size === "large" ? 2.5 : 2}
          strokeLinejoin="round"
        />
        {s.dots.map((d, i) => {
          const c = d.out ? t.danger : t.brand;
          return (
            <G key={i}>
              {d.ring ? (
                <Circle
                  cx={d.x}
                  cy={d.y}
                  r={d.r + 4}
                  fill="none"
                  stroke={t.deep}
                  strokeWidth={2}
                />
              ) : null}
              <Circle
                cx={d.x}
                cy={d.y}
                r={d.r}
                stroke={c}
                strokeWidth={2}
                fill={d.hollow ? t.card : c}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// One result: red when out of range, Low/High, * when converted
export function ResultCell({
  point,
  unit,
  explain = false,
}: {
  point: LabPoint;
  unit: string;
  explain?: boolean;
}) {
  const t = useTheme();
  const note = point.converted
    ? `Converted from ${point.written} ${point.writtenUnit}`
    : point.otherUnit
      ? `In ${point.writtenUnit}: can't be converted to ${unit}`
      : undefined;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
      accessibilityHint={note}
    >
      <Txt bold={Boolean(point.flag)} color={point.flag ? t.danger : t.ink}>
        {point.shown}
        {point.otherUnit ? ` ${point.writtenUnit}` : ""}
        {point.converted ? "*" : ""}
      </Txt>
      <LabFlagBadge flag={point.flag} />
      {explain && point.converted ? (
        <Txt tone="tiny" muted>
          (from {point.written} {point.writtenUnit})
        </Txt>
      ) : null}
    </View>
  );
}

export function TrendArrow({
  point,
  previous,
}: {
  point: LabPoint;
  previous: LabPoint | undefined;
}) {
  const t = useTheme();
  if (
    !previous ||
    point.value === null ||
    previous.value === null ||
    point.otherUnit ||
    previous.otherUnit
  )
    return null;
  const diff = point.value - previous.value;
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const label =
    diff > 0
      ? "Up since last time"
      : diff < 0
        ? "Down since last time"
        : "Same as last time";
  return <Icon size={14} color={t.muted} accessibilityLabel={label} />;
}

export const latestLine = (s: LabSeries) => {
  const latest = s.points.at(-1)!;
  return `${s.points.length} ${s.points.length === 1 ? "result" : "results"}, latest ${dateLabel(latest.date)}`;
};
