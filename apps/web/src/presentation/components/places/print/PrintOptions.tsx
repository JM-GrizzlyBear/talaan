import { CheckboxField } from "../../ui/CheckboxField";
import { SelectField } from "../../ui/SelectField";
import { TextField } from "../../ui/TextField";
import { sheetLayout } from "./labelLayout";
import { SizeInputs } from "./SizeInputs";
import {
  CUSTOM_LIMITS,
  LABEL_SIZES,
  MARGINS,
  PAPER_SIZES,
  paperSize,
  type LabelSizeId,
  type PaperId,
  type PrintSettings,
} from "./sizes";

const mm = (n: number) => `${Math.round(n * 10) / 10}`;

// Paper, label size, margin, cut lines, and spaces already used on the sheet
export function PrintOptions({
  settings,
  onChange,
  skip,
  onSkip,
  perSheet,
}: {
  settings: PrintSettings;
  onChange: (settings: PrintSettings) => void;
  skip: number;
  onSkip: (skip: number) => void;
  perSheet: number;
}) {
  const set = <K extends keyof PrintSettings>(
    key: K,
    value: PrintSettings[K],
  ) => onChange({ ...settings, [key]: value });
  const paper = paperSize(settings);
  // "Medium · 70 × 37 mm · 24 per sheet"
  const fits = (size: { width: number; height: number }) =>
    sheetLayout(paper, size, settings.margin).perSheet;

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label="Paper"
        value={settings.paper}
        onChange={(v) => set("paper", v as PaperId)}
        options={[
          ...Object.entries(PAPER_SIZES).map(([value, p]) => ({
            value,
            label: `${p.name} · ${mm(p.width)} × ${mm(p.height)} mm`,
          })),
          { value: "custom", label: "Custom size" },
        ]}
      />
      {settings.paper === "custom" && (
        <SizeInputs
          label="Paper"
          value={settings.customPaper}
          limits={CUSTOM_LIMITS.paper}
          onChange={(size) => set("customPaper", size)}
        />
      )}
      <SelectField
        label="Label size"
        value={settings.label}
        onChange={(v) => set("label", v as LabelSizeId)}
        options={[
          ...Object.entries(LABEL_SIZES).map(([value, l]) => ({
            value,
            label: `${l.name} · ${l.width} × ${l.height} mm · ${fits(l)} per sheet`,
          })),
          { value: "custom", label: "Custom size" },
        ]}
      />
      {settings.label === "custom" && (
        <SizeInputs
          label="Label"
          value={settings.customLabel}
          limits={CUSTOM_LIMITS.label}
          onChange={(size) => set("customLabel", size)}
        />
      )}
      <SelectField
        label="Page margin"
        value={String(settings.margin)}
        onChange={(v) => set("margin", Number(v))}
        options={MARGINS.map((m) => ({
          value: String(m.value),
          label: m.name,
        }))}
      />
      <TextField
        label="Labels already used on the first sheet"
        type="number"
        inputMode="numeric"
        min={0}
        max={Math.max(0, perSheet - 1)}
        value={String(skip)}
        onChange={(v) => onSkip(Math.max(0, Math.floor(Number(v) || 0)))}
      />
      <CheckboxField
        checked={settings.cutLines}
        onChange={(checked) => set("cutLines", checked)}
      >
        Show cut lines (for plain paper)
      </CheckboxField>
    </div>
  );
}
