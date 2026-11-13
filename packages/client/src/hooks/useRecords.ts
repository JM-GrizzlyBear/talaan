import type { RecordFieldsInput } from "@talaan/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createRecord,
  deleteRecordForever,
  emptyTrash,
  fetchAccounts,
  fetchActivity,
  fetchRecord,
  fetchRecordHistory,
  fetchRecords,
  fetchTrash,
  moveRecordToTrash,
  restoreRecord,
  updateRecord,
  type RecordFilters,
} from "../api/recordsApi";

// Every change refreshes lists, records, the Trash and the history
const RECORDS_KEY = ["records"] as const;

export function useRecordAccounts() {
  return useQuery({
    queryKey: [...RECORDS_KEY, "accounts"],
    queryFn: async () => await fetchAccounts(),
  });
}

export function useRecordList(filters: RecordFilters) {
  return useQuery({
    queryKey: [...RECORDS_KEY, "list", filters],
    queryFn: async () => await fetchRecords(filters),
  });
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: [...RECORDS_KEY, "one", id],
    queryFn: async () => await fetchRecord(id),
    retry: false,
    // "": no record (a reminder not about one)
    enabled: id !== "",
  });
}

export function useRecordHistory(id: string) {
  return useQuery({
    queryKey: [...RECORDS_KEY, "history", id],
    queryFn: async () => await fetchRecordHistory(id),
  });
}

export function useTrash() {
  return useQuery({
    queryKey: [...RECORDS_KEY, "trash"],
    queryFn: async () => await fetchTrash(),
  });
}

export function useActivity() {
  return useInfiniteQuery({
    queryKey: [...RECORDS_KEY, "activity"],
    queryFn: async ({ pageParam }) => await fetchActivity(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  });
}

function useRecordsChange<Input, Output>(
  change: (input: Input) => Promise<Output>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => await change(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECORDS_KEY }),
  });
}

export const useCreateRecord = () =>
  useRecordsChange((input: { ownerId: string; fields: RecordFieldsInput }) =>
    createRecord(input.ownerId, input.fields),
  );
export const useUpdateRecord = () =>
  useRecordsChange((input: { id: string; fields: RecordFieldsInput }) =>
    updateRecord(input.id, input.fields),
  );
export const useMoveToTrash = () =>
  useRecordsChange((id: string) => moveRecordToTrash(id));
export const useRestoreRecord = () =>
  useRecordsChange((id: string) => restoreRecord(id));
export const useDeleteForever = () =>
  useRecordsChange((id: string) => deleteRecordForever(id));
export const useEmptyTrash = () => useRecordsChange(() => emptyTrash());
