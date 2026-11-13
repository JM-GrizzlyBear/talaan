import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, RefreshCw, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Txt } from "../ui/kit";

// Talaan's own camera, inside the app (the same camera as Scan a QR label).
// "Take a photo" opens it instead of the phone's camera app, which doesn't
// open on some phones in Expo Go and can't open over a dialog on iPhones.

export interface Shot {
  uri: string;
  width: number;
  height: number;
}

type Request = {
  resolve: (shot: Shot | null) => void;
  reject: (e: unknown) => void;
};
type Host = (request: Request) => void;

// The hosts on screen, newest last: a dialog (its own window) has its own
// host, so the camera opens on top of it
const hosts: Host[] = [];

export function openCamera(): Promise<Shot | null> {
  const host = hosts.at(-1);
  if (!host)
    return Promise.reject(
      new Error("The camera isn't ready. Please try again."),
    );
  return new Promise((resolve, reject) => host({ resolve, reject }));
}

export function CameraHost() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    const host: Host = (next) =>
      setRequest((current) => {
        current?.resolve(null);
        return next;
      });
    hosts.push(host);
    return () => {
      const i = hosts.lastIndexOf(host);
      if (i >= 0) hosts.splice(i, 1);
    };
  }, []);
  if (!request) return null;
  return (
    <TakePicture
      onDone={(shot) => {
        request.resolve(shot);
        setRequest(null);
      }}
      onFail={(error) => {
        request.reject(error);
        setRequest(null);
      }}
    />
  );
}

function TakePicture({
  onDone,
  onFail,
}: {
  onDone: (shot: Shot | null) => void;
  onFail: (error: unknown) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const asked = useRef(false);

  // Ask once, right away
  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !asked.current
    ) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const take = async () => {
    if (!camera.current || taking) return;
    setTaking(true);
    try {
      const picture = await camera.current.takePictureAsync({
        quality: 0.9,
        shutterSound: false,
      });
      onDone({
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
      });
    } catch (error) {
      setTaking(false);
      onFail(error);
    }
  };

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#000", zIndex: 1000, elevation: 1000 },
      ]}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {!permission ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View
            style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14 }}
          >
            <Txt color="#fff" style={{ textAlign: "center" }}>
              Talaan needs the camera to take a photo of the paper. The photo
              stays on this record.
            </Txt>
            {permission.canAskAgain ? (
              <Button onPress={() => void requestPermission()}>
                Allow the camera
              </Button>
            ) : (
              <>
                <Txt color="#ddd" tone="small" style={{ textAlign: "center" }}>
                  The camera is turned off for Talaan (or Expo Go). Turn it on
                  in the phone&apos;s Settings.
                </Txt>
                <Button onPress={() => void Linking.openSettings()}>
                  Open Settings
                </Button>
              </>
            )}
            <Button kind="secondary" onPress={() => onDone(null)}>
              Cancel
            </Button>
          </View>
        ) : (
          <>
            <CameraView
              ref={camera}
              style={{ flex: 1 }}
              facing={facing}
              onCameraReady={() => setReady(true)}
              onMountError={(e) =>
                onFail(new Error(`The camera couldn't start: ${e.message}`))
              }
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 28,
                paddingVertical: 18,
              }}
            >
              <Pressable
                onPress={() => onDone(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                hitSlop={12}
                style={{ padding: 10 }}
              >
                <X size={30} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => void take()}
                disabled={!ready || taking}
                accessibilityRole="button"
                accessibilityLabel="Take the photo"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  borderWidth: 5,
                  borderColor: "#fff",
                  backgroundColor: ready ? "#ffffff33" : "#ffffff11",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {taking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Camera size={30} color="#fff" />
                )}
              </Pressable>
              <Pressable
                onPress={() =>
                  setFacing((f) => (f === "back" ? "front" : "back"))
                }
                accessibilityRole="button"
                accessibilityLabel="Switch camera"
                hitSlop={12}
                style={{ padding: 10 }}
              >
                <RefreshCw size={28} color="#fff" />
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
