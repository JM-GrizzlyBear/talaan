import type { RecordAccountInfo } from "@talaan/shared";
import { useSearchParams } from "react-router";

// ?owner=…&person=self|<profile id>, defaulting to you
export function usePersonParams(accounts: RecordAccountInfo[] | undefined) {
  const [params, setParams] = useSearchParams();
  const list = accounts ?? [];
  const account =
    list.find((a) => a.ownerId === params.get("owner")) ?? list[0] ?? null;
  const profileId = params.get("person") ?? "self";
  const person = account ? { ownerId: account.ownerId, profileId } : null;
  const query = person
    ? new URLSearchParams({
        owner: person.ownerId,
        person: person.profileId,
      }).toString()
    : "";
  return { account, person, query, params, setParams };
}
