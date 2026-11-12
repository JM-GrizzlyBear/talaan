import { type Appearance, DEFAULT_APPEARANCE } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { saveAppearance } from "../../infrastructure/api/appearanceApi";
import {
  applyLook,
  lookFor,
  rememberedLook,
  rememberLook,
} from "../../infrastructure/appearance/look";
import { useCurrentUser, useUpdateSession } from "../auth/useAuth";

// Paints the page in the signed-in person's colors (or, signed out, in the
// ones this browser used last), and follows the device's light or dark
// setting when that's the choice
export function useAppearanceSync() {
  const { data: user, isPending } = useCurrentUser();
  const appearance = user?.appearance;

  useEffect(() => {
    if (isPending) return;
    const look = appearance ? lookFor(appearance) : rememberedLook();
    if (!look) {
      applyLook(lookFor(DEFAULT_APPEARANCE));
      return;
    }
    applyLook(look);
    if (appearance) rememberLook(look);
    if (look.mode !== "system" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyLook(look);
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [appearance, isPending]);
}

// Saves a change; the page changes at once, and goes back if saving fails
export function useSaveAppearance() {
  const { data: user } = useCurrentUser();
  const updateSession = useUpdateSession();
  return useMutation({
    mutationFn: async (appearance: Appearance) =>
      await saveAppearance(appearance),
    onMutate: (appearance) => {
      const before = user?.appearance;
      updateSession((s) => ({ ...s, user: { ...s.user, appearance } }));
      return { before };
    },
    onError: (_error, _appearance, context) => {
      const before = context?.before;
      if (before) {
        updateSession((s) => ({
          ...s,
          user: { ...s.user, appearance: before },
        }));
      }
    },
    onSuccess: (saved) =>
      updateSession((s) => ({ ...s, user: { ...s.user, ...saved } })),
  });
}
