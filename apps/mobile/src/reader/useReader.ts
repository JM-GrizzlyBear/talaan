import { apiAddress, type PhoneFile } from "@talaan/client";
import type { RecordFileInfo } from "@talaan/shared";
import { useCallback, useRef, useState } from "react";
import { base64Of } from "../files/phoneFiles";
import type { BridgeMessage, ReadProgress, ReadResult } from "./readerTypes";

// Reading a photo or PDF with the website's reader (ReaderFrame), the same
// steps as the website: choose → reading → check (or failed)
export type ReaderState =
  | { step: "choose" }
  | { step: "reading"; name: string; progress: ReadProgress | null }
  | { step: "check"; name: string; result: ReadResult }
  | { step: "failed"; message: string };

// An attached file's bytes, through the API (with the app's token)
async function attachedBase64(file: RecordFileInfo) {
  const { url, headers } = apiAddress(
    `/api/files/${file.id}/content?variant=original`,
  );
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error("That file couldn't be opened.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function useReader() {
  const [state, setState] = useState<ReaderState>({ step: "choose" });
  const send = useRef<((json: string) => void) | null>(null);
  const ready = useRef(false);
  const waiting = useRef<string | null>(null);
  const current = useRef(0);
  const name = useRef("");

  const onMessage = useCallback((message: BridgeMessage) => {
    if (message.type === "ready") {
      ready.current = true;
      if (waiting.current && send.current) {
        send.current(waiting.current);
        waiting.current = null;
      }
      return;
    }
    if (message.type === "drawn") return;
    if (message.id !== current.current && message.id !== -1) return;
    if (message.type === "progress") {
      setState({
        step: "reading",
        name: name.current,
        progress: message.progress,
      });
    } else if (message.type === "done") {
      setState({ step: "check", name: name.current, result: message.result });
    } else {
      setState({ step: "failed", message: message.message });
    }
  }, []);

  const onSend = useCallback((fn: (json: string) => void) => {
    send.current = fn;
  }, []);

  const start = useCallback(
    async (fileName: string, mime: string, load: () => Promise<string>) => {
      current.current += 1;
      const id = current.current;
      name.current = fileName;
      setState({ step: "reading", name: fileName, progress: null });
      try {
        const base64 = await load();
        const json = JSON.stringify({
          type: "read",
          id,
          name: fileName,
          mime,
          base64,
        });
        if (ready.current && send.current) send.current(json);
        else waiting.current = json;
      } catch (error) {
        setState({
          step: "failed",
          message:
            error instanceof Error
              ? error.message
              : "That file couldn't be opened.",
        });
      }
    },
    [],
  );

  return {
    state,
    frame: { onMessage, onSend },
    read: (file: PhoneFile) =>
      start(file.name, file.type, () => base64Of(file)),
    readAttached: (file: RecordFileInfo) =>
      start(
        file.name,
        file.format === "pdf"
          ? "application/pdf"
          : `image/${file.format === "jpg" ? "jpeg" : file.format}`,
        () => attachedBase64(file),
      ),
    reset: () => setState({ step: "choose" }),
  };
}
