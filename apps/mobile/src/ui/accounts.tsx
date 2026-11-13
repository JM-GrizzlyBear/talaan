import { ACCESS_LABELS, type RecordAccountInfo } from "@talaan/shared";
import { Select } from "./form";

export function accountLabel(account: RecordAccountInfo) {
  return account.role === "owner"
    ? "My records"
    : `${account.ownerName}'s records (${ACCESS_LABELS[account.role].name})`;
}

// "Whose records": only when someone shared theirs with you
export function AccountSelect({
  accounts,
  value,
  onChange,
  label = "Whose records",
}: {
  accounts: RecordAccountInfo[];
  value: string;
  onChange: (ownerId: string) => void;
  label?: string;
}) {
  if (accounts.length < 2) return null;
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={accounts.map((a) => ({
        value: a.ownerId,
        label: accountLabel(a),
      }))}
    />
  );
}

// "Who": everyone, or one person in that account ("self" is the owner)
export function PersonSelect({
  account,
  value,
  onChange,
  everyone = "Everyone",
  label = "Who",
}: {
  account: RecordAccountInfo;
  value: string;
  onChange: (person: string) => void;
  everyone?: string | null;
  label?: string;
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[
        ...(everyone ? [{ value: "", label: everyone }] : []),
        ...account.people.map((p) => ({
          value: p.profileId ?? "self",
          label: p.name,
        })),
      ]}
    />
  );
}
