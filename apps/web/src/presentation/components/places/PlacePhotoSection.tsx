import type { PlaceInfo } from "@talaan/shared";
import { Camera, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import {
  useRemovePlacePhoto,
  useUploadPlacePhoto,
} from "../../../application/places/usePlaces";
import { placePhotoUrl } from "../../../infrastructure/api/placesApi";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { InlineConfirm } from "../ui/InlineConfirm";
import { buttonSecondary, dangerLinkButton } from "../ui/styles";

// The photo of where the place is, and for managers: add, replace, remove
export function PlacePhotoSection({
  place,
  canChange,
}: {
  place: PlaceInfo;
  canChange: boolean;
}) {
  const upload = useUploadPlacePhoto();
  const remove = useRemovePlacePhoto();
  const [progress, setProgress] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  async function send(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setProgress(0);
    try {
      await upload.mutateAsync({ id: place.id, file, onProgress: setProgress });
    } catch {
      // Shown from upload.error
    } finally {
      setProgress(null);
    }
  }

  if (!place.hasPhoto && !canChange) return null;
  const busy = progress !== null || remove.isPending;

  return (
    <section aria-labelledby="photo-heading" className="flex flex-col gap-2">
      <h2 id="photo-heading" className="text-lg font-bold">
        Photo
      </h2>
      {upload.isError && <ErrorAlert message={errorMessage(upload.error)} />}
      {remove.isError && <ErrorAlert message={errorMessage(remove.error)} />}
      {place.hasPhoto ? (
        <a
          href={placePhotoUrl(place.id, "original", place.updatedAt)}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={placePhotoUrl(place.id, "preview", place.updatedAt)}
            alt={`Where ${place.name} is`}
            className="max-h-96 w-full rounded-xl border border-edge bg-white object-contain"
          />
        </a>
      ) : (
        <p className="text-sm text-muted">
          A picture of where it is makes it easy to find later.
        </p>
      )}
      {progress !== null && (
        <p role="status" className="text-sm text-muted">
          Uploading… {Math.round(progress * 100)}%
        </p>
      )}
      {canChange && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className={buttonSecondary}
          >
            <Camera aria-hidden="true" className="size-4" />
            {place.hasPhoto ? "Take a new photo" : "Take a photo"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => pickRef.current?.click()}
            className={buttonSecondary}
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            {place.hasPhoto ? "Choose another" : "Choose a photo"}
          </button>
          {place.hasPhoto &&
            (confirming ? (
              <InlineConfirm
                question="Remove the photo?"
                confirmLabel="Remove"
                pending={remove.isPending}
                onConfirm={() =>
                  remove.mutate(place.id, {
                    onSettled: () => setConfirming(false),
                  })
                }
                onCancel={() => setConfirming(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={dangerLinkButton}
              >
                Remove photo
              </button>
            ))}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void send(e.target.files)}
          />
          <input
            ref={pickRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            aria-label="Choose a photo of the place"
            className="hidden"
            onChange={(e) => void send(e.target.files)}
          />
        </div>
      )}
    </section>
  );
}
