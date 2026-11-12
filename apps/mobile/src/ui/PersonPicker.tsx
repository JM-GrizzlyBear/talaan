import type { RecordAccountInfo } from "@talaan/shared";
import { Pressable, ScrollView } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "./kit";

export interface Person {
  ownerId: string;
  // "self": the account owner
  profileId: string;
  name: string;
}

// Everyone whose records you can see: you, your family profiles, and the
// families who shared with you
export function peopleOf(accounts: RecordAccountInfo[]): Person[] {
  return accounts.flatMap((a) =>
    a.people.map((p) => ({
      ownerId: a.ownerId,
      profileId: p.profileId ?? "self",
      name: p.name,
    })),
  );
}

export const samePerson = (a: Person | null, b: Person) =>
  Boolean(a && a.ownerId === b.ownerId && a.profileId === b.profileId);

export function PersonPicker({
  people,
  chosen,
  onChoose,
}: {
  people: Person[];
  chosen: Person | null;
  onChoose: (person: Person) => void;
}) {
  const t = useTheme();
  if (people.length <= 1) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {people.map((p) => {
        const on = samePerson(chosen, p);
        return (
          <Pressable
            key={`${p.ownerId}:${p.profileId}`}
            onPress={() => onChoose(p)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              minHeight: 40,
              justifyContent: "center",
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? t.brand : t.edge,
              backgroundColor: on ? t.brandSoft : t.card,
            }}
          >
            <Txt tone="label" color={on ? t.deep : t.ink}>
              {p.name}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
