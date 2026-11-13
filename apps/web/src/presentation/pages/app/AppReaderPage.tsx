import { useEffect } from "react";
import { readLabDocument } from "../../../infrastructure/reader/readLabDocument";
import { ReaderError } from "../../../infrastructure/reader/ReaderError";
import { drawLockScreen } from "../../components/medical/lockscreen/drawLockScreen";
import { useNoIndex } from "../../components/ui/useNoIndex";

// The phone app's helper. The app opens this page inside itself (hidden):
// - "read": a photo or PDF, read here on the phone with the website's reader;
//   only the text that was read goes back to the app
// - "lockscreen": draws the Medical ID lock screen picture, like the website
// Nothing is sent to a server. No sign-in: it only uses what it's given.

interface DrawMessage {
  type: "lockscreen";
  id: number;
  picture: Parameters<typeof drawLockScreen>[1];
}

interface ReadMessage {
  type: "read";
  id: number;
  name: string;
  mime: string;
  base64: string;
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

function send(message: unknown) {
  const text = JSON.stringify(message);
  // Inside the app (a WebView), or the app's web preview (an iframe)
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
  else if (window.parent !== window) window.parent.postMessage(text, "*");
}

function toBlob(base64: string, mime: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function AppReaderPage() {
  useNoIndex();
  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      let data: ReadMessage | DrawMessage;
      try {
        data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type === "lockscreen") {
        const canvas = document.createElement("canvas");
        drawLockScreen(canvas, data.picture);
        send({
          type: "drawn",
          id: data.id,
          dataUrl: canvas.toDataURL("image/png"),
        });
        return;
      }
      if (data?.type !== "read") return;
      try {
        const result = await readLabDocument(
          toBlob(data.base64, data.mime),
          data.name,
          (progress) => send({ type: "progress", id: data.id, progress }),
        );
        send({ type: "done", id: data.id, result });
      } catch (error) {
        send({
          type: "failed",
          id: data.id,
          message:
            error instanceof ReaderError
              ? error.message
              : "This file couldn't be read. Try again, or try a clearer photo.",
        });
      }
    }
    const onEvent = (event: Event) => void onMessage(event as MessageEvent);
    window.addEventListener("message", onEvent);
    // Android's WebView sends to document
    document.addEventListener("message", onEvent);
    send({ type: "ready" });
    return () => {
      window.removeEventListener("message", onEvent);
      document.removeEventListener("message", onEvent);
    };
  }, []);

  return (
    <main className="p-4 text-sm text-muted">
      Talaan's reader: reading on this phone.
    </main>
  );
}
