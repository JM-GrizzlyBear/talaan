import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRecordFiles,
  removeRecordFile,
  uploadRecordFile,
} from "../../infrastructure/api/filesApi";

// recordId undefined (a record not saved yet): no files to ask for
export function useRecordFiles(recordId: string | undefined) {
  return useQuery({
    queryKey: ["records", "files", recordId],
    queryFn: async () => await fetchRecordFiles(recordId ?? ""),
    enabled: Boolean(recordId),
  });
}

// Files change the record's history and the paperclip count in lists too
function useRefreshRecords() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["records"] });
}

export function useUploadRecordFile(recordId: string) {
  const refresh = useRefreshRecords();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      onProgress: (fraction: number) => void;
    }) => await uploadRecordFile(recordId, input.file, input.onProgress),
    onSuccess: refresh,
  });
}

export function useRemoveRecordFile() {
  const refresh = useRefreshRecords();
  return useMutation({
    mutationFn: async (id: string) => await removeRecordFile(id),
    onSuccess: refresh,
  });
}
