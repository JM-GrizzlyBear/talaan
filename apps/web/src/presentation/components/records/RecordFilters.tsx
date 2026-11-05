import {
  ACCESS_LABELS,
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  type RecordAccountInfo,
  type RecordType,
} from "@talaan/shared";
import { SelectField } from "../ui/SelectField";

// Whose records (when some are shared with you), who, and which type
export function RecordFilters({
  accounts,
  account,
  person,
  type,
  onChange,
}: {
  accounts: RecordAccountInfo[];
  account: RecordAccountInfo;
  person: string;
  type: RecordType | "";
  onChange: (key: "owner" | "person" | "type", value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {accounts.length > 1 && (
        <SelectField
          label="Whose records"
          value={account.ownerId}
          onChange={(value) => onChange("owner", value)}
          options={accounts.map((a) => ({
            value: a.ownerId,
            label: accountLabel(a),
          }))}
        />
      )}
      <SelectField
        label="Who"
        value={person}
        onChange={(value) => onChange("person", value)}
        options={[
          { value: "", label: "Everyone" },
          ...account.people.map((p) => ({
            value: p.profileId ?? "self",
            label: p.name,
          })),
        ]}
      />
      <SelectField
        label="Type"
        value={type}
        onChange={(value) => onChange("type", value)}
        options={[
          { value: "", label: "All types" },
          ...RECORD_TYPES.map((t) => ({
            value: t,
            label: RECORD_TYPE_LABELS[t],
          })),
        ]}
      />
    </div>
  );
}

function accountLabel(account: RecordAccountInfo) {
  return account.role === "owner"
    ? "My records"
    : `${account.ownerName}'s records (${ACCESS_LABELS[account.role].name})`;
}
