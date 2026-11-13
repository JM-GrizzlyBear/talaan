import {
  fileProblem,
  uploadRecordFile,
  useRemoveRecordFile,
  useRecordFiles,
} from "@talaan/client";
import { FILE_LIMITS, formatBytes, type RecordFileInfo } from "@talaan/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Camera, FileText, ImagePlus, Upload } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messageOf } from "../api/ApiError";
import {
  chooseFiles,
  choosePhotos,
  type PickedFile,
  takePhoto,
} from "../files/phoneFiles";
import { downloadAndOpen, fileImage } from "../files/openFile";
import { useTheme } from "../theme/ThemeProvider";
import { ConfirmBox } from "../ui/form";
import { Button, Buttons, ErrorNotice, Notice, Section, Txt } from "../ui/kit";

interface Upload {
  key: number;
  name: string;
  progress: number;
  error?: string;
}

let nextKey = 1;

// Photos and PDFs on a record: thumbnails, adding from the camera or the
// phone, the full-size viewer, Download, and Remove (like the website)
export function RecordFiles({
  recordId,
  canChange,
  onRead,
}: {
  recordId: string;
  canChange: boolean;
  // Lab records: "Read lab values from this"
  onRead?: (file: RecordFileInfo) => void;
}) {
  const t = useTheme();
  const files = useRecordFiles(recordId);
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [open, setOpen] = useState<RecordFileInfo | null>(null);
  const [pickError, setPickError] = useState<unknown>(null);
  const list = files.data ?? [];
  const room =
    FILE_LIMITS.perRecord -
    list.length -
    uploads.filter((u) => !u.error).length;

  async function add(picked: PickedFile[]) {
    for (const file of picked.slice(0, Math.max(0, room))) {
      const key = nextKey++;
      // (Size unknown: the API checks it)
      const problem = fileProblem({
        name: file.name,
        type: file.type,
        size: file.size ?? 1,
      });
      if (problem) {
        setUploads((u) => [
          ...u,
          { key, name: file.name, progress: 0, error: problem },
        ]);
        continue;
      }
      setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
      try {
        await uploadRecordFile(recordId, file, (progress) =>
          setUploads((u) =>
            u.map((x) => (x.key === key ? { ...x, progress } : x)),
          ),
        );
        setUploads((u) => u.filter((x) => x.key !== key));
        await queryClient.invalidateQueries({ queryKey: ["records"] });
      } catch (error) {
        setUploads((u) =>
          u.map((x) => (x.key === key ? { ...x, error: messageOf(error) } : x)),
        );
      }
    }
  }

  const pick = async (
    from: () => Promise<PickedFile[] | PickedFile | null>,
  ) => {
    setPickError(null);
    try {
      const got = await from();
      const picked = Array.isArray(got) ? got : got ? [got] : [];
      if (picked.length > 0) await add(picked);
    } catch (error) {
      setPickError(error);
    }
  };

  return (
    <Section
      title={`Photos and PDFs${list.length ? ` (${list.length})` : ""}`}
      note={
        canChange
          ? `Up to ${FILE_LIMITS.perRecord} per record, ${formatBytes(FILE_LIMITS.maxBytes)} each.`
          : undefined
      }
    >
      <ErrorNotice error={files.error ?? pickError} />
      {list.length === 0 && !files.isPending ? (
        <Txt muted>No photos or PDFs yet.</Txt>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {list.map((file) => (
          <Pressable
            key={file.id}
            onPress={() => setOpen(file)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${file.name}. Open`}
            style={{ width: 104, gap: 4 }}
          >
            {file.format === "pdf" ? (
              <View
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: t.edge,
                  backgroundColor: t.page,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <FileText size={30} color={t.brand} />
                <Txt tone="tiny" color={t.brand} bold>
                  PDF{file.pages ? ` · ${file.pages} p` : ""}
                </Txt>
              </View>
            ) : (
              <Image
                source={fileImage(file.id, "thumb")}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 10,
                  backgroundColor: t.page,
                }}
                contentFit="cover"
                cachePolicy="disk"
              />
            )}
            <Txt tone="tiny" muted numberOfLines={1}>
              {file.name}
            </Txt>
          </Pressable>
        ))}
      </View>
      {uploads.map((u) => (
        <View
          key={u.key}
          style={{
            borderWidth: 1,
            borderColor: t.edge,
            borderRadius: 10,
            padding: 10,
            gap: 6,
            backgroundColor: t.card,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Txt tone="small" bold style={{ flex: 1 }} numberOfLines={1}>
              {u.name}
            </Txt>
            {u.error ? (
              <Button
                kind="link"
                small
                onPress={() =>
                  setUploads((x) => x.filter((y) => y.key !== u.key))
                }
              >
                Dismiss
              </Button>
            ) : (
              <Txt tone="small" muted>
                {Math.round(u.progress * 100)}%
              </Txt>
            )}
          </View>
          {u.error ? (
            <Txt tone="small" color={t.danger}>
              {u.error}
            </Txt>
          ) : (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(u.progress * 100),
              }}
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: t.page,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.max(4, u.progress * 100)}%`,
                  height: 6,
                  backgroundColor: t.brand,
                }}
              />
            </View>
          )}
        </View>
      ))}
      {canChange && room > 0 ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Camera}
            onPress={() => void pick(takePhoto)}
          >
            Take a photo
          </Button>
          <Button
            kind="secondary"
            small
            icon={ImagePlus}
            onPress={() => void pick(choosePhotos)}
          >
            From photos
          </Button>
          <Button
            kind="secondary"
            small
            icon={Upload}
            onPress={() => void pick(chooseFiles)}
          >
            A PDF or file
          </Button>
        </Buttons>
      ) : null}
      {canChange && room <= 0 ? (
        <Notice>
          This record has the most files it can ({FILE_LIMITS.perRecord}).
        </Notice>
      ) : null}
      <FileViewer
        file={open}
        files={list}
        canChange={canChange}
        onRead={onRead}
        onChange={setOpen}
      />
    </Section>
  );
}

function FileViewer({
  file,
  files,
  canChange,
  onRead,
  onChange,
}: {
  file: RecordFileInfo | null;
  files: RecordFileInfo[];
  canChange: boolean;
  onRead?: (file: RecordFileInfo) => void;
  onChange: (file: RecordFileInfo | null) => void;
}) {
  const remove = useRemoveRecordFile();
  const [confirming, setConfirming] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<unknown>(null);
  const index = file ? files.findIndex((f) => f.id === file.id) : -1;
  const close = () => {
    setConfirming(false);
    setOpenError(null);
    remove.reset();
    onChange(null);
  };

  const download = async () => {
    if (!file) return;
    setOpening(true);
    setOpenError(null);
    try {
      await downloadAndOpen(
        `/api/files/${file.id}/content?variant=original&download=1`,
        file.name,
        file.format === "pdf" ? "application/pdf" : undefined,
      );
    } catch (error) {
      setOpenError(error);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal visible={Boolean(file)} animationType="fade" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
        {file ? (
          <>
            <View
              style={{
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Txt color="#fff" bold numberOfLines={1}>
                  {file.name}
                </Txt>
                <Txt tone="tiny" color="#bbb">
                  {formatBytes(file.bytes)}
                  {files.length > 1 ? ` · ${index + 1} of ${files.length}` : ""}
                  {file.uploadedByName
                    ? ` · added by ${file.uploadedByName}`
                    : ""}
                </Txt>
              </View>
              <Button kind="secondary" small onPress={close}>
                Close
              </Button>
            </View>
            {file.format === "pdf" ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: 24,
                }}
              >
                <FileText size={64} color="#fff" />
                <Txt color="#ddd" style={{ textAlign: "center" }}>
                  Open the PDF to read it.
                </Txt>
              </View>
            ) : (
              <Image
                source={fileImage(file.id, "preview")}
                style={{ flex: 1 }}
                contentFit="contain"
                cachePolicy="disk"
                accessibilityLabel={file.name}
              />
            )}
            <ScrollView
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
            >
              <ErrorNotice error={openError ?? remove.error} />
              {files.length > 1 ? (
                <Buttons>
                  <Button
                    kind="secondary"
                    small
                    disabled={index <= 0}
                    onPress={() => onChange(files[index - 1] ?? null)}
                  >
                    Previous
                  </Button>
                  <Button
                    kind="secondary"
                    small
                    disabled={index >= files.length - 1}
                    onPress={() => onChange(files[index + 1] ?? null)}
                  >
                    Next
                  </Button>
                </Buttons>
              ) : null}
              <Buttons>
                <Button small busy={opening} onPress={() => void download()}>
                  {file.format === "pdf" ? "Open PDF" : "Save or share"}
                </Button>
                {onRead ? (
                  <Button
                    kind="secondary"
                    small
                    onPress={() => {
                      const f = file;
                      close();
                      onRead(f);
                    }}
                  >
                    Read lab values from this
                  </Button>
                ) : null}
                {canChange && !confirming ? (
                  <Button
                    kind="secondary"
                    small
                    onPress={() => setConfirming(true)}
                  >
                    Remove
                  </Button>
                ) : null}
              </Buttons>
              {confirming ? (
                <ConfirmBox
                  message="Remove this file?"
                  confirmLabel="Yes, remove"
                  cancelLabel="Keep"
                  busy={remove.isPending}
                  onConfirm={() => remove.mutate(file.id, { onSuccess: close })}
                  onCancel={() => setConfirming(false)}
                />
              ) : null}
            </ScrollView>
          </>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
