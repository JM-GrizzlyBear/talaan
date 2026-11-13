import { FILE_LIMITS } from "@talaan/shared";
import { useRef, useState } from "react";
import { useUploadRecordFile, fileProblem } from "@talaan/client";
import { errorMessage } from "../../../format/errorMessage";

// One file on its way up, as shown under the tiles
export interface FileUpload {
  key: number;
  name: string;
  progress: number;
  state: "waiting" | "uploading" | "saving" | "failed";
  error?: string;
}

// Uploads files to a record one at a time (so a slow phone connection isn't
// split many ways), with progress for each. "room": how many more fit.
export function useFileUploads(recordId: string, room: number) {
  const upload = useUploadRecordFile(recordId);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const nextKey = useRef(1);

  function patch(key: number, change: Partial<FileUpload>) {
    setUploads((all) =>
      all.map((u) => (u.key === key ? { ...u, ...change } : u)),
    );
  }

  async function addFiles(chosen: FileList | null) {
    if (!chosen || chosen.length === 0) return;
    const items = Array.from(chosen).map((file, index) => {
      const problem =
        index >= room
          ? `A record holds up to ${FILE_LIMITS.perRecord} files.`
          : fileProblem(file);
      return {
        file,
        entry: {
          key: nextKey.current++,
          name: file.name || "photo.jpg",
          progress: 0,
          state: problem ? "failed" : "waiting",
          error: problem ?? undefined,
        } as FileUpload,
      };
    });
    setUploads((all) => [...all, ...items.map((i) => i.entry)]);
    for (const { file, entry } of items) {
      if (entry.state === "failed") continue;
      patch(entry.key, { state: "uploading" });
      try {
        await upload.mutateAsync({
          file,
          onProgress: (fraction) =>
            patch(entry.key, {
              progress: fraction,
              state: fraction >= 1 ? "saving" : "uploading",
            }),
        });
        setUploads((all) => all.filter((u) => u.key !== entry.key));
      } catch (error) {
        patch(entry.key, { state: "failed", error: errorMessage(error) });
      }
    }
  }

  function dismiss(key: number) {
    setUploads((all) => all.filter((u) => u.key !== key));
  }

  return { uploads, addFiles, dismiss };
}
