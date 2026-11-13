import {
  shortDate,
  shortDateTime,
  useMoveToTrash,
  useRecord,
  useRecordHistory,
} from "@talaan/client";
import {
  ACCESS_LABELS,
  formatPesos,
  RECORD_TYPE_LABELS,
  type RecordInfo,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { BellPlus, ChartLine, Link2, Pencil, Trash } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { PlacePath } from "../../../src/places/PlacePath";
import { RecordFiles } from "../../../src/records/RecordFiles";
import {
  HistoryList,
  LabTable,
  MedicinesList,
  TextBlock,
} from "../../../src/records/RecordParts";
import { RECORD_ICONS } from "../../../src/records/RecordTypeIcon";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { ConfirmBox } from "../../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Facts,
  Loading,
  Notice,
  Screen,
  Section,
  Txt,
} from "../../../src/ui/kit";

export default function RecordScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const record = useRecord(id);
  return (
    <>
      <Stack.Screen options={{ title: record.data?.title ?? "Record" }} />
      {record.isPending ? (
        <Loading />
      ) : record.isError ? (
        <Screen>
          <ErrorNotice error={record.error} />
        </Screen>
      ) : (
        <RecordView
          record={record.data}
          refreshing={record.isRefetching}
          onRefresh={() => void record.refetch()}
        />
      )}
    </>
  );
}

const peso = (value: number | null) => formatPesos(value) ?? "—";

function detailFacts(record: RecordInfo): [string, string][] {
  switch (record.type) {
    case "imaging":
      return [["What was imaged", record.details.bodyPart]];
    case "vaccination":
      return [
        ["Vaccine", record.details.vaccine],
        ["Dose", record.details.dose],
      ];
    case "billing":
      return [
        ["HMO", record.details.hmo],
        ["LOA / approval number", record.details.loaNumber],
        ["Total bill", peso(record.details.totalAmount)],
        ["HMO covered", peso(record.details.hmoCovered)],
        ["You paid", peso(record.details.youPaid)],
      ];
    default:
      return [];
  }
}

function RecordView({
  record,
  refreshing,
  onRefresh,
}: {
  record: RecordInfo;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const { fileProblem } = useLocalSearchParams<{ fileProblem?: string }>();
  const canManage = record.role === "owner" || record.role === "manage";
  const history = useRecordHistory(record.id);
  const trash = useMoveToTrash();
  const [confirming, setConfirming] = useState(false);
  const Icon = RECORD_ICONS[record.type];
  const person = record.profileId ?? "self";

  const compare =
    record.type === "lab" ? (
      <Button
        kind="secondary"
        small
        icon={ChartLine}
        onPress={() =>
          router.push({
            pathname: "/labs",
            params: { owner: record.ownerId, person, record: record.id },
          })
        }
      >
        Compare with earlier results
      </Button>
    ) : null;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon size={16} color={t.brand} />
          <Txt tone="small" color={t.brand} bold>
            {RECORD_TYPE_LABELS[record.type]}
          </Txt>
        </View>
        <Txt tone="title" selectable>
          {record.title}
        </Txt>
        <Txt muted>
          {record.personName} · {shortDate(record.recordDate)}
          {record.role !== "owner"
            ? ` · You ${ACCESS_LABELS[record.role].name.toLowerCase()}`
            : ""}
        </Txt>
      </View>

      {canManage ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Pencil}
            onPress={() => router.push(`/records/${record.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            kind="secondary"
            small
            icon={BellPlus}
            onPress={() =>
              router.push({
                pathname: "/reminders/new",
                params: { owner: record.ownerId, record: record.id },
              })
            }
          >
            Add a reminder
          </Button>
          {compare}
          <Button
            kind="secondary"
            small
            icon={Link2}
            onPress={() =>
              router.push({
                pathname: "/shares/new",
                params: { owner: record.ownerId, person, record: record.id },
              })
            }
          >
            Share with a doctor
          </Button>
          {!confirming ? (
            <Button
              kind="secondary"
              small
              icon={Trash}
              onPress={() => setConfirming(true)}
            >
              Move to Trash
            </Button>
          ) : null}
        </Buttons>
      ) : (
        compare
      )}
      {confirming ? (
        <ConfirmBox
          message={`Move “${record.title}” to the Trash? ${record.role === "owner" ? "You can restore it for 30 days." : "The owner can restore it for 30 days."} Your name is saved in the history.`}
          confirmLabel={trash.isPending ? "Moving…" : "Move to Trash"}
          busy={trash.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            // (Awaited, not an onSuccess: the screen may switch to "not there
            // anymore" before a callback would run)
            const { ownerId, title } = record;
            try {
              await trash.mutateAsync(record.id);
            } catch {
              return;
            }
            router.replace({
              pathname: "/records",
              params: { owner: ownerId, trashed: title },
            });
          }}
        />
      ) : null}
      <ErrorNotice error={trash.error} />

      <Card>
        <Facts
          rows={[
            ["For", record.personName],
            ["Date", shortDate(record.recordDate)],
            ["Doctor", record.doctor],
            ["Clinic or hospital", record.facility],
            ...detailFacts(record),
          ]}
        />
        {record.place ? (
          <View style={{ gap: 2 }}>
            <Txt tone="small" muted>
              Kept in
            </Txt>
            <PlacePath path={record.place.path} />
          </View>
        ) : null}
      </Card>

      {record.type === "lab" && record.details.results.length > 0 ? (
        <LabTable results={record.details.results} />
      ) : null}
      {record.type === "prescription" && record.details.medicines.length > 0 ? (
        <MedicinesList medicines={record.details.medicines} />
      ) : null}
      {record.type === "imaging" && record.details.reading ? (
        <TextBlock title="Reading" text={record.details.reading} />
      ) : null}
      {record.notes ? <TextBlock title="Notes" text={record.notes} /> : null}

      {fileProblem ? (
        <Notice tone="error">
          {`The record was saved, but the photo couldn't be added (${fileProblem}). Add it again below.`}
        </Notice>
      ) : null}
      <RecordFiles
        recordId={record.id}
        canChange={canManage}
        onRead={
          record.type === "lab" && canManage
            ? (file) =>
                router.push({
                  pathname: "/records/[id]/edit",
                  params: { id: record.id, readFile: file.id },
                })
            : undefined
        }
      />

      <Txt tone="small" muted>
        Added{record.createdByName ? ` by ${record.createdByName}` : ""} on{" "}
        {shortDateTime(record.createdAt)}
        {record.updatedAt !== record.createdAt
          ? `. Last changed${record.updatedByName ? ` by ${record.updatedByName}` : ""} on ${shortDateTime(record.updatedAt)}`
          : ""}
        .
      </Txt>

      <Section title="History">
        <ErrorNotice error={history.error} />
        {history.data ? <HistoryList entries={history.data} /> : null}
      </Section>
    </Screen>
  );
}
