import type { RecordFileInfo } from "@talaan/shared";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../auth/SessionProvider";
import { WEB_URL } from "../config";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Card, Txt } from "../ui/kit";

// The record's photos (tap for full size); PDFs open on the website
export function RecordFiles({
  recordId,
  files,
}: {
  recordId: string;
  files: RecordFileInfo[];
}) {
  const t = useTheme();
  const { api } = useSession();
  const [open, setOpen] = useState<RecordFileInfo | null>(null);
  return (
    <Card>
      <Txt tone="heading">Photos and PDFs ({files.length})</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {files.map((file) =>
          file.format === "pdf" ? (
            <Pressable
              key={file.id}
              onPress={() =>
                void Linking.openURL(`${WEB_URL}/records/${recordId}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`${file.name}, a PDF. Opens on the website`}
              style={{
                width: 104,
                height: 104,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: t.edge,
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                backgroundColor: t.page,
              }}
            >
              <Txt tone="label" color={t.brand}>
                PDF
              </Txt>
              <Txt
                tone="small"
                muted
                numberOfLines={2}
                style={{ textAlign: "center" }}
              >
                {file.name}
              </Txt>
            </Pressable>
          ) : (
            <Pressable
              key={file.id}
              onPress={() => setOpen(file)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${file.name}. Tap to see it full size`}
            >
              <Image
                source={api.fileSource(file.id, "thumb")}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 10,
                  backgroundColor: t.page,
                }}
                contentFit="cover"
                cachePolicy="memory"
              />
            </Pressable>
          ),
        )}
      </View>
      <Modal
        visible={Boolean(open)}
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          {open && (
            <Image
              source={api.fileSource(open.id, "preview")}
              style={{ flex: 1 }}
              contentFit="contain"
              cachePolicy="memory"
              accessibilityLabel={open.name}
            />
          )}
          <View style={{ padding: 16 }}>
            <Button kind="secondary" onPress={() => setOpen(null)}>
              Close
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </Card>
  );
}
