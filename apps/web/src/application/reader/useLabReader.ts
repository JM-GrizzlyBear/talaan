import type { RecordFileInfo } from "@talaan/shared";
import { useCallback, useRef, useState } from "react";
import { ApiError } from "../../infrastructure/api/http";
import { fetchFileContent } from "../../infrastructure/api/filesApi";
import type { ReadProgress } from "../../infrastructure/reader/progress";
import {
  readLabDocument,
  type ReadLabDocument,
} from "../../infrastructure/reader/readLabDocument";
import { ReaderError } from "../../infrastructure/reader/ReaderError";

export type ReaderState =
  | { step: "choose" }
  | { step: "reading"; name: string; progress: ReadProgress }
  | { step: "check"; name: string; result: ReadLabDocument }
  | { step: "failed"; name: string; message: string };

const STARTING: ReadProgress = { step: "preparing", fraction: 0 };

// Messages people can act on; anything else gets a general one
function failure(error: unknown) {
  if (error instanceof ReaderError || error instanceof ApiError) {
    return error.message;
  }
  return "This file couldn't be read. Try again, or try a clearer photo.";
}

// Choose a photo or PDF → read it on this device → check the rows
export function useLabReader() {
  const [state, setState] = useState<ReaderState>({ step: "choose" });
  // A newer read replaces an older one still running
  const run = useRef(0);

  const readWith = useCallback(
    async (name: string, getFile: () => Promise<Blob>) => {
      const mine = ++run.current;
      const update = (next: ReaderState) => {
        if (run.current === mine) setState(next);
      };
      update({ step: "reading", name, progress: STARTING });
      try {
        const file = await getFile();
        const result = await readLabDocument(file, name, (progress) =>
          update({ step: "reading", name, progress }),
        );
        update({ step: "check", name, result });
      } catch (error) {
        update({ step: "failed", name, message: failure(error) });
      }
    },
    [],
  );

  // A photo just taken or chosen
  const read = useCallback(
    (file: File) => readWith(file.name || "photo.jpg", async () => file),
    [readWith],
  );

  // A photo or PDF already on the record
  const readAttached = useCallback(
    (file: RecordFileInfo) =>
      readWith(file.name, () => fetchFileContent(file.id)),
    [readWith],
  );

  const reset = useCallback(() => {
    run.current++;
    setState({ step: "choose" });
  }, []);

  return { state, read, readAttached, reset };
}
