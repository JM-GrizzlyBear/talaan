import { Modal, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Txt } from "./kit";

// The web preview: the same page in a frame
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
  return (
    <Modal
      visible={url !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: t.card }}>
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
          <iframe
            title={title}
            src={url}
            style={{ flex: 1, border: 0, width: "100%" }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
