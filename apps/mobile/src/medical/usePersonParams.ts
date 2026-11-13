import type { RecordAccountInfo } from "@talaan/shared";
import { useLocalSearchParams, useRouter } from "expo-router";

// ?owner=…&person=self|<profile id>, defaulting to you (like the website)
export function usePersonParams(accounts: RecordAccountInfo[] | undefined) {
  const params = useLocalSearchParams<{ owner?: string; person?: string }>();
  const router = useRouter();
  const list = accounts ?? [];
  const account =
    list.find((a) => a.ownerId === params.owner) ?? list[0] ?? null;
  const profileId = params.person ?? "self";
  const person = account ? { ownerId: account.ownerId, profileId } : null;
  const query: Record<string, string> = person
    ? { owner: person.ownerId, person: person.profileId }
    : {};
  return {
    account,
    person,
    query,
    setPerson: (owner: string, profile: string) =>
      router.setParams({ owner, person: profile }),
  };
}
