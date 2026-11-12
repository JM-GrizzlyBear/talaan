import { RECORD_TYPE_LABELS } from "@talaan/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { messageOf } from "../../src/api/ApiError";
import { useSession } from "../../src/auth/SessionProvider";
import { useSavedQuery } from "../../src/offline/useSavedQuery";
import { LabResults, Medicines } from "../../src/records/RecordParts";
import { RecordFiles } from "../../src/records/RecordFiles";
import { useTheme } from "../../src/theme/ThemeProvider";
import { shortDate } from "../../src/ui/dates";
import { Card, Facts, Loading, Notice, Screen, Txt } from "../../src/ui/kit";
import { OfflineNote } from "../../src/ui/OfflineNote";

export default function RecordScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, offlineOnly, status } = useSession();
  const record = useSavedQuery(["record", id], () => api.record(id));
  const files = useQuery({
    queryKey: ["files", id],
    queryFn: () => api.recordFiles(id),
    enabled: status === "ready" && !offlineOnly && !record.savedAt,
  });

  if (record.isPending) return <Loading />;
  if (record.isError) {
    return (
      <Screen>
        <Notice tone="error">{messageOf(record.error)}</Notice>
      </Screen>
    );
  }
  const r = record.data;
  const d = r.details as Record<string, unknown>;
  return (
    <Screen
      onRefresh={() => void record.refetch()}
      refreshing={record.isRefetching}
    >
      <Stack.Screen options={{ title: RECORD_TYPE_LABELS[r.type] }} />
      <OfflineNote savedAt={record.savedAt} />
      <Txt tone="small" color={t.brand} style={{ fontWeight: "700" }}>
        {RECORD_TYPE_LABELS[r.type]}
      </Txt>
      <Txt tone="title" selectable>
        {r.title}
      </Txt>
      <Card>
        <Facts
          rows={[
            ["For", r.personName],
            ["Date", shortDate(r.recordDate)],
            ["Doctor", r.doctor],
            ["Clinic or hospital", r.facility],
            ["Kept in", r.place?.path.map((p) => p.name).join(" › ")],
            ["Body part", d.bodyPart as string],
            ["Vaccine", d.vaccine as string],
            ["Dose", d.dose as string],
            ["HMO", d.hmo as string],
            ["LOA number", d.loaNumber as string],
            [
              "Total bill",
              typeof d.totalAmount === "number"
                ? `₱${(d.totalAmount as number).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                : null,
            ],
            [
              "HMO covered",
              typeof d.hmoCovered === "number"
                ? `₱${(d.hmoCovered as number).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                : null,
            ],
            [
              "You paid",
              typeof d.youPaid === "number"
                ? `₱${(d.youPaid as number).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                : null,
            ],
          ]}
        />
      </Card>
      {r.type === "lab" && r.details.results.length > 0 && (
        <LabResults record={r} />
      )}
      {r.type === "prescription" && r.details.medicines.length > 0 && (
        <Medicines record={r} />
      )}
      {r.type === "imaging" && r.details.reading ? (
        <Card>
          <Txt tone="heading">Reading</Txt>
          <Txt selectable>{r.details.reading}</Txt>
        </Card>
      ) : null}
      {r.notes ? (
        <Card>
          <Txt tone="heading">Notes</Txt>
          <Txt selectable>{r.notes}</Txt>
        </Card>
      ) : null}
      {files.data && files.data.length > 0 && (
        <RecordFiles recordId={r.id} files={files.data} />
      )}
      {(offlineOnly || record.savedAt) && (
        <Txt tone="small" muted>
          Photos need the internet.
        </Txt>
      )}
    </Screen>
  );
}
