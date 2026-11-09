import type { RecordAccountInfo } from "@talaan/shared";
import { SelectField } from "../ui/SelectField";

// Everyone whose lab results you can see: you, your family profiles, and
// the people in accounts shared with you. Value: "ownerId|profileId|self".
export function PersonPicker({
  accounts,
  ownerId,
  profileId,
  onChange,
}: {
  accounts: RecordAccountInfo[];
  ownerId: string;
  profileId: string;
  onChange: (ownerId: string, profileId: string) => void;
}) {
  const options = accounts.flatMap((account) =>
    account.people.map((person) => ({
      value: `${account.ownerId}|${person.profileId ?? "self"}`,
      label:
        account.role === "owner"
          ? person.name
          : `${person.name} (${account.ownerName}'s records)`,
    })),
  );
  return (
    <SelectField
      label="Whose results"
      value={`${ownerId}|${profileId}`}
      onChange={(value) => {
        const [owner, profile] = value.split("|");
        onChange(owner, profile);
      }}
      options={options}
    />
  );
}
