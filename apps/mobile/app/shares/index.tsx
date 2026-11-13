import {
  openedText,
  sharedThings,
  shortDateTime,
  useRecordAccounts,
  useShares,
} from "@talaan/client";
import { Stack, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { usePersonParams } from "../../src/medical/usePersonParams";
import { ShareStatusBadge } from "../../src/shares/ShareParts";
import { AccountSelect, PersonSelect } from "../../src/ui/accounts";
import {
  Button,
  Empty,
  ErrorNotice,
  List,
  Loading,
  Row,
  Screen,
  Section,
  Txt,
} from "../../src/ui/kit";

// The links made for doctors, open ones first
export default function Shares() {
  const router = useRouter();
  const accounts = useRecordAccounts();
  const mine = (accounts.data ?? []).filter(
    (a) => a.role === "owner" || a.role === "manage",
  );
  const { account, person, query, setPerson } = usePersonParams(mine);
  const links = useShares(account?.ownerId);
  const forPerson = (links.data ?? []).filter(
    (l) => (l.profileId ?? "self") === person?.profileId,
  );
  const open = forPerson.filter(
    (l) => l.status === "open" || l.status === "used",
  );
  const ended = forPerson.filter(
    (l) => l.status === "expired" || l.status === "stopped",
  );
  const list = (title: string, items: typeof forPerson) => (
    <Section title={title}>
      <List>
        {items.map((link, i) => (
          <Row
            key={link.id}
            first={i === 0}
            title={link.recipient}
            badge={<ShareStatusBadge status={link.status} />}
            subtitle={`${sharedThings(link)}\n${
              link.status === "stopped"
                ? `Stopped ${shortDateTime(link.stoppedAt ?? link.expiresAt)}`
                : `${link.status === "expired" ? "Ended" : "Until"} ${shortDateTime(link.expiresAt)}`
            } · ${openedText(link)}${link.hasPin ? " · PIN" : ""}`}
            onPress={() => router.push(`/shares/${link.id}`)}
          />
        ))}
      </List>
    </Section>
  );
  return (
    <Screen
      onRefresh={() => void links.refetch()}
      refreshing={links.isRefetching}
    >
      <Stack.Screen options={{ title: "Share with a doctor" }} />
      <Txt muted>
        A link (and QR) that opens only what you choose, without signing in,
        until it ends or you stop it.
      </Txt>
      {person ? (
        <Button
          icon={Plus}
          onPress={() =>
            router.push({ pathname: "/shares/new", params: query })
          }
        >
          New link
        </Button>
      ) : null}
      {accounts.isPending ? <Loading /> : null}
      <ErrorNotice error={accounts.error ?? links.error} />
      {accounts.data && mine.length === 0 ? (
        <Txt muted>
          Only the owner of records, or family who can manage them, can share
          them.
        </Txt>
      ) : null}
      {account && person ? (
        <View style={{ gap: 12 }}>
          <AccountSelect
            accounts={mine}
            value={account.ownerId}
            onChange={(o) => setPerson(o, "self")}
          />
          <PersonSelect
            account={account}
            value={person.profileId}
            everyone={null}
            onChange={(p) => setPerson(account.ownerId, p)}
          />
        </View>
      ) : null}
      {links.isPending && account ? <Loading /> : null}
      {links.data && forPerson.length === 0 ? (
        <Empty
          title="No links yet."
          text="Before a check-up, make a link with the records the doctor needs. You'll be told when it's opened."
        />
      ) : null}
      {open.length > 0 ? list("Open", open) : null}
      {ended.length > 0 ? list("Ended", ended) : null}
    </Screen>
  );
}
