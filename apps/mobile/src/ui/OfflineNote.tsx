import { useSession } from "../auth/SessionProvider";
import { shortDateTime } from "./dates";
import { Notice } from "./kit";

// Shown when a screen is showing the copy saved on the phone
export function OfflineNote({ savedAt }: { savedAt: string | null }) {
  const { offlineOnly } = useSession();
  if (!savedAt && !offlineOnly) return null;
  return (
    <Notice tone="warn">
      {savedAt
        ? `No internet: showing what was saved on this phone (${shortDateTime(savedAt)}).`
        : "No internet: showing what was saved on this phone."}
    </Notice>
  );
}
