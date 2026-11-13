import { shortDateTime } from "@talaan/client";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSession } from "../auth/SessionProvider";
import { savedState } from "../offline/savedResponses";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "./kit";

// Above the menu while a screen shows what was saved on the phone
export function OfflineNote() {
  const t = useTheme();
  const { offlineOnly } = useSession();
  const [savedAt, setSavedAt] = useState(savedState.current());
  useEffect(() => savedState.subscribe(setSavedAt), []);
  if (!savedAt && !offlineOnly) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: t.warnSoft,
        borderTopWidth: 1,
        borderColor: t.warnEdge,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <Txt tone="small" color={t.warn} bold>
        {savedAt
          ? `No internet: showing what was saved on this phone (${shortDateTime(savedAt)}). Changes need internet.`
          : "No internet: showing what was saved on this phone. Changes need internet."}
      </Txt>
    </View>
  );
}
