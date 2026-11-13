import type { UploadFile } from "../api/upload";
import type { PlaceFieldsInput, PlaceInfo } from "@talaan/shared";
import { useState } from "react";
import { useUploadPlacePhoto } from "./usePlaces";

// Saving a place, then its photo when one was chosen. The place is kept even
// if the photo fails; the person can add the photo again from its page.
export function useSavePlace(
  save: (fields: PlaceFieldsInput) => Promise<PlaceInfo>,
) {
  const upload = useUploadPlacePhoto();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function run(fields: PlaceFieldsInput, photo: UploadFile | null) {
    setPending(true);
    setError(null);
    try {
      const place = await save(fields);
      let photoFailed = false;
      if (photo) {
        setProgress(0);
        try {
          await upload.mutateAsync({
            id: place.id,
            file: photo,
            onProgress: setProgress,
          });
        } catch {
          photoFailed = true;
        }
      }
      return { place, photoFailed };
    } catch (caught) {
      setError(caught);
      return null;
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return { run, pending, error, progress };
}
