import { TextField } from "../../ui/TextField";
import { linkButton } from "../../ui/styles";
import { FormSection } from "./FormSection";
import type { FormPartProps } from "./formParts";
import { parseNumber } from "./recordFormState";

// HMO / Billing: the HMO, LOA number and amounts
export function BillingSection({ form, set, error }: FormPartProps) {
  const total = parseNumber(form.totalAmount);
  const covered = parseNumber(form.hmoCovered);
  const remaining =
    typeof total === "number" && typeof covered === "number"
      ? Math.max(0, Math.round((total - covered) * 100) / 100)
      : null;
  return (
    <FormSection title="HMO / Billing">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="HMO (optional)"
          value={form.hmo}
          onChange={(value) => set("hmo", value)}
          placeholder="Maxicare, Intellicare, PhilHealth…"
          maxLength={120}
          error={error("details.hmo")}
        />
        <TextField
          label="LOA / approval number (optional)"
          value={form.loaNumber}
          onChange={(value) => set("loaNumber", value)}
          maxLength={60}
          error={error("details.loaNumber")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Total bill (₱)"
          value={form.totalAmount}
          onChange={(value) => set("totalAmount", value)}
          inputMode="decimal"
          placeholder="45,210.50"
          error={error("details.totalAmount")}
        />
        <TextField
          label="HMO covered (₱)"
          value={form.hmoCovered}
          onChange={(value) => set("hmoCovered", value)}
          inputMode="decimal"
          error={error("details.hmoCovered")}
        />
        <TextField
          label="You paid (₱)"
          value={form.youPaid}
          onChange={(value) => set("youPaid", value)}
          inputMode="decimal"
          error={error("details.youPaid")}
        />
      </div>
      {remaining !== null && form.youPaid.trim() === "" && (
        <button
          type="button"
          onClick={() => set("youPaid", String(remaining))}
          className={`${linkButton} self-start`}
        >
          Fill “You paid” with ₱
          {remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })}{" "}
          (total minus HMO)
        </button>
      )}
    </FormSection>
  );
}
