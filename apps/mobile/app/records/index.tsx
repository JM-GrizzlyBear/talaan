import {
  parseSearch,
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  type RecordType,
  scoreSearch,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { messageOf } from "../../src/api/ApiError";
import { useSession } from "../../src/auth/SessionProvider";
import { useSavedQuery } from "../../src/offline/useSavedQuery";
import { useTheme } from "../../src/theme/ThemeProvider";
import { shortDate } from "../../src/ui/dates";
import { Card, Loading, Notice, Screen, Txt } from "../../src/ui/kit";
import { OfflineNote } from "../../src/ui/OfflineNote";
import { PersonPicker } from "../../src/ui/PersonPicker";
import { usePeople } from "../../src/ui/usePeople";

// One person's records, newest first: find, filter by type, open
export default function Records() {
  const t = useTheme();
  const router = useRouter();
  const { api } = useSession();
  const { people, person, choose, accounts } = usePeople();
  const [type, setType] = useState<RecordType | "">("");
  const [search, setSearch] = useState("");
  const list = useSavedQuery(
    ["records", person?.ownerId, person?.profileId],
    () => api.records(person!.ownerId, person!.profileId),
    Boolean(person),
  );

  const query = parseSearch(search);
  const records = (list.data?.records ?? [])
    .filter((r) => !type || r.type === type)
    .filter(
      (r) =>
        query.length === 0 ||
        scoreSearch(query, [
          { text: r.title, weight: 3 },
          { text: RECORD_TYPE_LABELS[r.type], weight: 2 },
          {
            text: `${r.facility} ${r.doctor} ${r.recordDate} ${shortDate(r.recordDate)}`,
            weight: 1,
          },
        ]).score > 0,
    );
  const types = RECORD_TYPES.filter((k) =>
    list.data?.records.some((r) => r.type === k),
  );

  return (
    <Screen
      onRefresh={() => void list.refetch()}
      refreshing={list.isRefetching}
    >
      <PersonPicker people={people} chosen={person} onChoose={choose} />
      <OfflineNote savedAt={list.savedAt} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Find: CBC, X-ray, St. Luke's, dugo…"
        placeholderTextColor={t.muted}
        accessibilityLabel="Find records"
        clearButtonMode="while-editing"
        style={{
          minHeight: 46,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.edge,
          backgroundColor: t.card,
          color: t.ink,
          paddingHorizontal: 14,
          fontSize: 16 * t.scale,
        }}
      />
      {types.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["", ...types] as const).map((k) => {
            const on = type === k;
            return (
              <Pressable
                key={k || "all"}
                onPress={() => setType(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  minHeight: 36,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: on ? t.brand : t.edge,
                  backgroundColor: on ? t.brandSoft : t.card,
                }}
              >
                <Txt
                  tone="small"
                  color={on ? t.deep : t.ink}
                  style={{ fontWeight: "600" }}
                >
                  {k ? RECORD_TYPE_LABELS[k] : "All"}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {(accounts.isPending || list.isPending) && <Loading />}
      {list.isError && <Notice tone="error">{messageOf(list.error)}</Notice>}
      {list.data && records.length === 0 && (
        <Txt muted>
          {list.data.records.length === 0
            ? "No records yet. Add them on the website for now."
            : "No records match."}
        </Txt>
      )}
      <View style={{ gap: 10 }}>
        {records.map((r) => (
          <Card
            key={r.id}
            onPress={() => router.push(`/records/${r.id}`)}
            label={`${r.title}, ${shortDate(r.recordDate)}`}
          >
            <Txt tone="small" color={t.brand} style={{ fontWeight: "700" }}>
              {RECORD_TYPE_LABELS[r.type]}
            </Txt>
            <Txt tone="heading">{r.title}</Txt>
            <Txt tone="small" muted>
              {[
                shortDate(r.recordDate),
                r.facility,
                r.fileCount > 0 &&
                  `${r.fileCount} ${r.fileCount === 1 ? "photo" : "photos"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Txt>
            {r.outOfRange > 0 && (
              <Txt tone="small" color={t.danger} style={{ fontWeight: "600" }}>
                {r.outOfRange} {r.outOfRange === 1 ? "result" : "results"}{" "}
                outside the normal range
              </Txt>
            )}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
