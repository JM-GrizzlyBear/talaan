import {
  shortDate,
  shortDateTime,
  useDeleteForever,
  useEmptyTrash,
  useRestoreRecord,
  useTrash,
} from "@talaan/client";
import { RECORD_TYPE_LABELS, TRASH_DAYS } from "@talaan/shared";
import { Stack } from "expo-router";
import { RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { RECORD_ICONS } from "../../src/records/RecordTypeIcon";
import { useTheme } from "../../src/theme/ThemeProvider";
import { ConfirmBox } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

// Records moved to the Trash: restore, or delete for good (only the owner)
export default function TrashScreen() {
  const t = useTheme();
  const trash = useTrash();
  const restore = useRestoreRecord();
  const remove = useDeleteForever();
  const empty = useEmptyTrash();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const error = trash.error ?? restore.error ?? remove.error ?? empty.error;
  const records = trash.data ?? [];

  return (
    <Screen
      onRefresh={() => void trash.refetch()}
      refreshing={trash.isRefetching}
    >
      <Stack.Screen options={{ title: "Trash" }} />
      <Txt muted>
        Records stay here for {TRASH_DAYS} days, then they're deleted for good.
        Only you can restore them or delete them sooner. The history keeps who
        moved each one here.
      </Txt>
      <ErrorNotice error={error} />
      {restored ? (
        <Notice>{`“${restored}” is back in your records.`}</Notice>
      ) : null}
      {trash.isPending ? <Loading /> : null}
      {trash.isSuccess && records.length === 0 ? (
        <Empty title="The Trash is empty." />
      ) : null}
      {records.map((record) => {
        const Icon = RECORD_ICONS[record.type];
        return (
          <Card key={record.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Icon size={22} color={t.muted} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold>{record.title}</Txt>
                <Txt tone="small" muted>
                  {RECORD_TYPE_LABELS[record.type]} · {record.personName} ·{" "}
                  {shortDate(record.recordDate)}
                </Txt>
                <Txt tone="small">
                  Moved here by {record.deletedByName ?? "someone"} on{" "}
                  {shortDateTime(record.deletedAt)}
                </Txt>
                <Txt tone="small" muted>
                  Deleted for good on {shortDate(record.purgeAt)}
                </Txt>
              </View>
            </View>
            {confirming === record.id ? (
              <ConfirmBox
                message={`Delete “${record.title}” for good? This can't be undone.`}
                confirmLabel="Yes, delete"
                busy={remove.isPending}
                onConfirm={() => remove.mutate(record.id)}
                onCancel={() => setConfirming(null)}
              />
            ) : (
              <Buttons>
                <Button
                  kind="secondary"
                  small
                  icon={RotateCcw}
                  label={`Restore ${record.title}`}
                  busy={restore.isPending && restore.variables === record.id}
                  onPress={() =>
                    restore.mutate(record.id, {
                      onSuccess: () => setRestored(record.title),
                    })
                  }
                >
                  Restore
                </Button>
                <Button
                  kind="link"
                  small
                  label={`Delete ${record.title} for good`}
                  onPress={() => setConfirming(record.id)}
                >
                  Delete for good
                </Button>
              </Buttons>
            )}
          </Card>
        );
      })}
      {records.length > 1 ? (
        confirming === "all" ? (
          <ConfirmBox
            message={`Delete all ${records.length} records in the Trash for good? This can't be undone.`}
            confirmLabel={empty.isPending ? "Deleting…" : "Empty the Trash"}
            cancelLabel="Keep them"
            busy={empty.isPending}
            onConfirm={() =>
              empty.mutate(undefined, { onSuccess: () => setConfirming(null) })
            }
            onCancel={() => setConfirming(null)}
          />
        ) : (
          <Button kind="secondary" onPress={() => setConfirming("all")}>
            Empty the Trash
          </Button>
        )
      ) : null}
    </Screen>
  );
}
