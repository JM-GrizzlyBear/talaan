import { useCallback, useRef, useState } from "react";
import type { ReadProgress } from "../../../../infrastructure/reader/progress";
import {
  readLabDocument,
  type ReadLabDocument,
} from "../../../../infrastructure/reader/readLabDocument";
import { ReaderError } from "../../../../infrastructure/reader/ReaderError";

export type ReaderState =
  | { step: "choose" }
  | { step: "reading"; name: string; progress: ReadProgress }
  | { step: "check"; name: string; result: ReadLabDocument }
  | { step: "failed"; name: string; message: string };

// Choose a photo or PDF → read it on this device → check the rows
export function useLabReader() {
  const [state, setState] = useState<ReaderState>({ step: "choose" });
  // A newer read replaces an older one still running
  const run = useRef(0);

  const read = useCallback(async (file: Blob, name: string) => {
    const mine = ++run.current;
    setState({
      step: "reading",
      name,
      progress: { step: "preparing", fraction: 0 },
    });
    try {
      const result = await readLabDocument(file, name, (progress) => {
        if (run.current === mine) setState({ step: "reading", name, progress });
      });
      if (run.current === mine) setState({ step: "check", name, result });
    } catch (error) {
      if (run.current === mine) {
        setState({
          step: "failed",
          name,
          message:
            error instanceof ReaderError
              ? error.message
              : "This file couldn't be read. Try again, or try a clearer photo.",
        });
      }
    }
  }, []);

  const reset = useCallback(() => {
    run.current++;
    setState({ step: "choose" });
  }, []);

  return { state, read, reset };
}
