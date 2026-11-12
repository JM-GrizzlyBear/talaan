import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "../api/ApiError";
import { useSession } from "../auth/SessionProvider";
import { offline } from "../storage/offline";

// A query that keeps an encrypted copy on the phone, and shows that copy
// when there's no internet. savedAt: when the copy was made (shown then).
export function useSavedQuery<T>(
  key: readonly unknown[],
  load: () => Promise<T>,
  enabled = true,
) {
  const name = key.join(":");
  // Nothing is loaded until it's unlocked (or while signing in)
  const { status } = useSession();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const query = useQuery({
    queryKey: key,
    enabled: enabled && status === "ready",
    queryFn: async () => {
      try {
        const value = await load();
        setSavedAt(null);
        void offline.save(name, value);
        return value;
      } catch (error) {
        if (error instanceof ApiError && error.offline) {
          const saved = await offline.load<T>(name);
          if (saved) {
            setSavedAt(saved.savedAt);
            return saved.value;
          }
        }
        throw error;
      }
    },
    retry: (count, error) =>
      !(error instanceof ApiError && error.status > 0) && count < 1,
  });
  return { ...query, savedAt };
}
