import { useActivity } from "@talaan/client";
import { Stack } from "expo-router";
import { HistoryList } from "../src/records/RecordParts";
import {
  Button,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../src/ui/kit";

// Everything that happened in your account. Only ever added to.
export default function Activity() {
  const activity = useActivity();
  const entries = activity.data?.pages.flatMap((page) => page.entries) ?? [];
  return (
    <Screen
      onRefresh={() => void activity.refetch()}
      refreshing={activity.isRefetching}
    >
      <Stack.Screen options={{ title: "Activity" }} />
      <Txt muted>
        Who added, changed or deleted what in your records, and who you shared
        them with. Nobody can change or delete this list, not even you.
      </Txt>
      <ErrorNotice error={activity.error} />
      {activity.isPending ? <Loading /> : null}
      {activity.isSuccess && entries.length === 0 ? (
        <Empty
          title="Nothing yet."
          text="Adding a record or inviting family shows up here."
        />
      ) : null}
      {entries.length > 0 ? (
        <HistoryList entries={entries} linkRecords />
      ) : null}
      {activity.hasNextPage ? (
        <Button
          kind="secondary"
          busy={activity.isFetchingNextPage}
          onPress={() => void activity.fetchNextPage()}
        >
          Show older
        </Button>
      ) : null}
    </Screen>
  );
}
