import { shortDate, useRecordAccounts, useRecordList } from "@talaan/client";
import {
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  type RecordType,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ChartLine,
  ClipboardList,
  Paperclip,
  Plus,
  Trash,
} from "lucide-react-native";
import { View } from "react-native";
import { RECORD_ICONS } from "../../src/records/RecordTypeIcon";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccountSelect, PersonSelect } from "../../src/ui/accounts";
import { Select } from "../../src/ui/form";
import {
  Badge,
  Button,
  Buttons,
  Empty,
  ErrorNotice,
  List,
  Loading,
  Notice,
  Row,
  Screen,
  Txt,
} from "../../src/ui/kit";

// Records, newest first, filtered by whose, who and type (like the website)
export default function Records() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    owner?: string;
    person?: string;
    type?: string;
    trashed?: string;
  }>();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.owner) ?? list[0] ?? null;
  const person = params.person ?? "";
  const type = (params.type ?? "") as RecordType | "";
  const records = useRecordList({
    ownerId: account?.ownerId,
    profileId: person || undefined,
    type: type || undefined,
  });

  const setFilter = (key: "owner" | "person" | "type", value: string) =>
    router.setParams({
      [key]: value || undefined,
      trashed: undefined,
      ...(key === "owner" ? { person: undefined } : {}),
    });

  const canAdd = account?.role === "owner" || account?.role === "manage";
  const add = () =>
    router.push({
      pathname: "/records/new",
      params: {
        ...(account ? { owner: account.ownerId } : {}),
        ...(person ? { person } : {}),
      },
    });

  return (
    <Screen
      onRefresh={() => void records.refetch()}
      refreshing={records.isRefetching}
    >
      <Stack.Screen options={{ title: "Records" }} />
      <Buttons>
        {canAdd ? (
          <Button small icon={Plus} onPress={add}>
            Add record
          </Button>
        ) : null}
        {account ? (
          <Button
            kind="secondary"
            small
            icon={ChartLine}
            onPress={() =>
              router.push({
                pathname: "/labs",
                params: { owner: account.ownerId },
              })
            }
          >
            Lab results
          </Button>
        ) : null}
        {account?.role === "owner" ? (
          <>
            <Button
              kind="secondary"
              small
              icon={ClipboardList}
              onPress={() => router.push("/activity")}
            >
              Activity
            </Button>
            <Button
              kind="secondary"
              small
              icon={Trash}
              onPress={() => router.push("/records/trash")}
            >
              Trash
            </Button>
          </>
        ) : null}
      </Buttons>

      {params.trashed ? (
        <Notice>
          {`“${params.trashed}” was moved to the Trash. ${account?.role === "owner" ? "You can restore it there for 30 days." : "The owner can restore it for 30 days."}`}
        </Notice>
      ) : null}
      <ErrorNotice error={accounts.error} />

      {account ? (
        <View style={{ gap: 12 }}>
          <AccountSelect
            accounts={list}
            value={account.ownerId}
            onChange={(v) => setFilter("owner", v)}
          />
          <PersonSelect
            account={account}
            value={person}
            onChange={(v) => setFilter("person", v)}
          />
          <Select
            label="Type"
            value={type}
            onChange={(v) => setFilter("type", v)}
            options={[
              { value: "" as RecordType | "", label: "All types" },
              ...RECORD_TYPES.map((v) => ({
                value: v,
                label: RECORD_TYPE_LABELS[v],
              })),
            ]}
          />
        </View>
      ) : null}

      {account?.role === "view" ? (
        <Txt tone="small" muted>
          {account.ownerName} shared these records with you to view.
        </Txt>
      ) : null}

      {records.isPending && account ? <Loading /> : null}
      <ErrorNotice error={records.error} />
      {records.data && records.data.records.length === 0 ? (
        <Empty
          title="No records here yet."
          text={
            person || type
              ? "Try another person or type."
              : "Start with the last X-ray, lab result or prescription you have on hand."
          }
          action={
            canAdd && !person && !type ? (
              <Button onPress={add}>Add the first record</Button>
            ) : undefined
          }
        />
      ) : null}
      {records.data && records.data.records.length > 0 ? (
        <List>
          {records.data.records.map((record, i) => (
            <Row
              key={record.id}
              first={i === 0}
              icon={RECORD_ICONS[record.type]}
              title={record.title}
              badge={
                record.outOfRange > 0 ? (
                  <Badge tone="danger">{`${record.outOfRange} out of range`}</Badge>
                ) : undefined
              }
              subtitle={`${RECORD_TYPE_LABELS[record.type]} · ${record.personName}${record.facility ? ` · ${record.facility}` : ""}`}
              right={
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Txt tone="small" muted>
                    {shortDate(record.recordDate)}
                  </Txt>
                  {record.fileCount > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 2,
                      }}
                      accessibilityLabel={`${record.fileCount} ${record.fileCount === 1 ? "file" : "files"}`}
                    >
                      <Paperclip size={12} color={t.muted} />
                      <Txt tone="tiny" muted>
                        {record.fileCount}
                      </Txt>
                    </View>
                  ) : null}
                </View>
              }
              onPress={() => router.push(`/records/${record.id}`)}
            />
          ))}
        </List>
      ) : null}
    </Screen>
  );
}
