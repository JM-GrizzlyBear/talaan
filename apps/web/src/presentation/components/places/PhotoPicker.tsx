import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { buttonSecondary, linkButton } from "../ui/styles";

const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

// Take or choose one photo; shows it before it's uploaded
export function PhotoPicker({
  file,
  onChange,
  label = "Photo of where it is (optional)",
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const take = (list: FileList | null) => onChange(list?.[0] ?? null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <p className="-mt-1 text-sm text-muted">
        A picture of the box, drawer or shelf makes it easy to find later.
      </p>
      {preview ? (
        <div className="flex items-start gap-3">
          {/* HEIC shows only in Safari; the name says what was chosen */}
          <img
            src={preview}
            alt="The chosen photo"
            className="size-28 rounded-lg border border-edge object-cover"
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm break-all">{file?.name}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`${linkButton} inline-flex items-center gap-1 self-start`}
            >
              <X aria-hidden="true" className="size-4" />
              Don't add it
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={buttonSecondary}
          >
            <Camera aria-hidden="true" className="size-4" />
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => pickRef.current?.click()}
            className={buttonSecondary}
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            Choose a photo
          </button>
        </div>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => take(e.target.files)}
      />
      <input
        ref={pickRef}
        type="file"
        accept={PHOTO_ACCEPT}
        aria-label="Choose a photo of the place"
        className="hidden"
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
