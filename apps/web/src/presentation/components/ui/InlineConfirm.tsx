import { dangerLinkButton, linkButton } from "./styles";

// "Remove Juanito's profile?  Yes, remove · Keep": a second click for anything
// that's hard to undo, right where the first click was
export function InlineConfirm({
  question,
  confirmLabel,
  cancelLabel = "Keep",
  onConfirm,
  onCancel,
  pending = false,
}: {
  question: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>{question}</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className={dangerLinkButton}
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={onCancel} className={linkButton}>
        {cancelLabel}
      </button>
    </div>
  );
}
