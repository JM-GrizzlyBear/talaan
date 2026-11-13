import { useEffect, useRef } from "react";
import { WEB_URL } from "../config";
import type { BridgeMessage } from "./readerTypes";

// The web preview: the same reader page, in a hidden iframe
export function ReaderFrame({
  onMessage,
  onSend,
}: {
  onMessage: (message: BridgeMessage) => void;
  onSend: (send: (json: string) => void) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      try {
        onMessage(JSON.parse(String(event.data)) as BridgeMessage);
      } catch {
        // Not the reader's
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [onMessage]);
  return (
    <iframe
      ref={ref}
      title="Reader"
      src={`${WEB_URL}/app-reader`}
      onLoad={() =>
        onSend((json) => ref.current?.contentWindow?.postMessage(json, "*"))
      }
      style={{
        width: 1,
        height: 1,
        opacity: 0,
        position: "absolute",
        border: 0,
      }}
    />
  );
}
