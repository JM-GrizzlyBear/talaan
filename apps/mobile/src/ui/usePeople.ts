import { useState } from "react";
import { useSession } from "../auth/SessionProvider";
import { useSavedQuery } from "../offline/useSavedQuery";
import { type Person, peopleOf } from "./PersonPicker";

// Everyone you can see, and who is chosen (you, at first)
export function usePeople() {
  const { api } = useSession();
  const accounts = useSavedQuery(["accounts"], () => api.accounts());
  const people = peopleOf(accounts.data ?? []);
  const [chosen, setChosen] = useState<Person | null>(null);
  return {
    accounts,
    people,
    person: chosen ?? people[0] ?? null,
    choose: setChosen,
  };
}
