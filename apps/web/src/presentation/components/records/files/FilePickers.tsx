import { FILE_ACCEPT } from "@talaan/shared";
import { Camera, Upload } from "lucide-react";
import { useRef } from "react";
import { buttonSecondary } from "../../ui/styles";

// "Take a photo" (the phone's camera) and "Add photos or PDFs" (pick files)
export function FilePickers({
  onFiles,
}: {
  onFiles: (files: FileList | null) => void;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {/* On a phone this opens the camera, for photographing the paper */}
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
        <Upload aria-hidden="true" className="size-4" />
        Add photos or PDFs
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose photos or PDFs"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
