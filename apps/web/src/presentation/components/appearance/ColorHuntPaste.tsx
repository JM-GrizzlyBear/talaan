import { buildTheme, parsePaletteText } from "@talaan/shared";
import { ExternalLink, Palette } from "lucide-react";
import { type FormEvent, useState } from "react";
import { TextField } from "../ui/TextField";
import { buttonSecondary } from "../ui/styles";
import { Swatches } from "./Swatches";

// Any palette from colorhunt.co: paste its link or its color codes
export function ColorHuntPaste({
  current,
  onUse,
}: {
  // The custom colors in use now, if any
  current: string[] | null;
  onUse: (colors: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const colors = text.trim() ? parsePaletteText(text) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!colors) {
      setError(
        "Paste a Color Hunt link, or 2 to 4 color codes like #222831 #00ADB5",
      );
      return;
    }
    setError(undefined);
    onUse(colors);
    setText("");
  };

  const adjusted = current && buildTheme(current).adjusted;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4"
    >
      <span className="flex items-center gap-2 font-semibold">
        <Palette aria-hidden="true" className="size-5 text-brand" />
        Use a palette from Color Hunt
      </span>
      <p className="text-sm text-muted">
        Find one you like on{" "}
        <a
          href="https://colorhunt.co/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-semibold text-brand underline"
        >
          colorhunt.co
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
        , open it, and copy the page's link (or its color codes) here.
      </p>
      <TextField
        label="Link or color codes"
        value={text}
        onChange={(v) => {
          setText(v);
          setError(undefined);
        }}
        placeholder="https://colorhunt.co/palette/222831393e4600adb5eeeeee"
        autoComplete="off"
        spellCheck={false}
        error={error}
      />
      {colors && <Swatches colors={colors} className="h-8" />}
      <button type="submit" className={`${buttonSecondary} self-start`}>
        Use these colors
      </button>
      {current && (
        <div className="flex flex-col gap-1.5 border-t border-edge pt-3">
          <span className="text-sm font-semibold">Your colors</span>
          <Swatches colors={current} className="h-8" />
          {adjusted && (
            <p className="text-sm text-muted">
              Some were made a little darker or lighter so text stays easy to
              read.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
