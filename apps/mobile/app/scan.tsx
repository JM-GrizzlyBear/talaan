import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import { labelFromScan } from "../src/places/labelFromScan";
import { normalizeLabelCode } from "@talaan/shared";
import { useTheme } from "../src/theme/ThemeProvider";
import { Field } from "../src/ui/form";
import { Button, Card, Notice, Screen, Txt } from "../src/ui/kit";

// Scanning a Talaan QR label opens its place (or names a blank one)
export default function Scan() {
  const t = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [notOurs, setNotOurs] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const done = useRef(false);
  const find = () => {
    const found = normalizeLabelCode(code);
    if (!found)
      return setCodeError(
        "A label code has 8 letters and numbers, like 7K4Q-M2XD",
      );
    router.replace(`/l/${found}`);
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: "Scan a QR label" }} />
      <Txt muted>
        Point the camera at a Talaan label on a folder, box or envelope.
      </Txt>
      {Platform.OS ===
      "web" ? null : !permission ? null : !permission.granted ? (
        <Card>
          <Txt>
            Talaan needs the camera to scan labels. Nothing is recorded.
          </Txt>
          <Button onPress={() => void requestPermission()}>
            Allow the camera
          </Button>
          {!permission.canAskAgain ? (
            <Txt tone="small" muted>
              The camera was turned off for Talaan (or Expo Go). Turn it on in
              the phone's Settings.
            </Txt>
          ) : null}
        </Card>
      ) : (
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            aspectRatio: 1,
            backgroundColor: "#000",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (done.current) return;
              const found = labelFromScan(data);
              if (!found) {
                setNotOurs(true);
                return;
              }
              done.current = true;
              router.replace(`/l/${found}`);
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: "20%",
              left: "20%",
              right: "20%",
              bottom: "20%",
              borderWidth: 3,
              borderColor: t.onBrand,
              borderRadius: 16,
            }}
          />
        </View>
      )}
      {notOurs ? (
        <Notice tone="warn">That QR code isn't a Talaan label.</Notice>
      ) : null}
      <Card>
        <Field
          label="Or type the code under the QR"
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setCodeError(undefined);
          }}
          placeholder="7K4Q-M2XD"
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={find}
          error={codeError}
        />
        <Button kind="secondary" onPress={find}>
          Find
        </Button>
      </Card>
    </Screen>
  );
}
