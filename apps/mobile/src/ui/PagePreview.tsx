import { type ComponentType, useState } from "react";
import { ActivityIndicator, Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewProps } from "react-native-webview";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Txt } from "./kit";

// (The WebView's class types don't line up with React 19's; same component)
const Web = WebView as unknown as ComponentType<WebViewProps>;

// A page someone else opens (a doctor's shared link, the emergency page),
// shown inside the app so you can see it without leaving Talaan
export function PagePreview({
  url,
  title,
  onClose,
}: {
  url: string | null;
  title: string;
  onClose: () => void;
}) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  return (
    <Modal
      visible={url !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: t.card }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.edge,
          }}
        >
          <Txt bold style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Txt>
          <Button kind="secondary" small onPress={onClose}>
            Close
          </Button>
        </View>
        {url ? (
          <View style={{ flex: 1 }}>
            <Web
              source={{ uri: url }}
              // A fresh visitor, like the person you share it with
              incognito
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              style={{ flex: 1, backgroundColor: t.page }}
            />
            {loading ? (
              <View
                style={{
                  position: "absolute",
                  top: 24,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={t.brand} />
              </View>
            ) : null}
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
