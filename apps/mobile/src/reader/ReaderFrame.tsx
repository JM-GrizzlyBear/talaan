import { type ComponentType, type Ref, useRef } from "react";
import { View } from "react-native";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from "react-native-webview";

// (The WebView's class types don't line up with React 19's; same component)
type WebViewHandle = { injectJavaScript: (script: string) => void };
const Web = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebViewHandle> }
>;
import { WEB_URL } from "../config";
import type { BridgeMessage } from "./readerTypes";

// The website's reader, hidden inside the app: the same reader (Tesseract and
// the PDF reader) runs here on the phone. The page is loaded from Talaan's
// website once; the photo itself never leaves the phone.
export function ReaderFrame({
  onMessage,
  onSend,
}: {
  onMessage: (message: BridgeMessage) => void;
  // Gives the parent a way to hand a file to the reader
  onSend: (send: (json: string) => void) => void;
}) {
  const ref = useRef<WebViewHandle>(null);
  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}>
      <Web
        ref={ref}
        source={{ uri: `${WEB_URL}/app-reader` }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onLoadEnd={() =>
          onSend((json) =>
            ref.current?.injectJavaScript(
              `window.dispatchEvent(new MessageEvent("message", { data: ${JSON.stringify(json)} })); true;`,
            ),
          )
        }
        onMessage={(event: WebViewMessageEvent) => {
          try {
            onMessage(JSON.parse(event.nativeEvent.data) as BridgeMessage);
          } catch {
            // Not one of the reader's messages
          }
        }}
        onError={() =>
          onMessage({
            type: "failed",
            id: -1,
            message:
              "The reader couldn't load. It needs internet the first time: check the connection and try again.",
          })
        }
      />
    </View>
  );
}
