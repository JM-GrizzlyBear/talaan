import {
  type Appearance,
  COLOR_MODE_LABELS,
  COLOR_MODES,
  DEFAULT_APPEARANCE,
  PALETTES,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_PERCENT,
  TEXT_SIZES,
} from "@talaan/shared";
import { Check, ExternalLink, Monitor, Moon, Sun } from "lucide-react";
import { useSaveAppearance } from "../../../application/appearance/useAppearance";
import { useCurrentUser } from "@talaan/client";
import { ChoiceCard } from "../../components/appearance/ChoiceCard";
import { ColorHuntPaste } from "../../components/appearance/ColorHuntPaste";
import { LookPreview } from "../../components/appearance/LookPreview";
import { Swatches } from "../../components/appearance/Swatches";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { errorMessage } from "../../format/errorMessage";

const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor };

// /settings/appearance: colors, light or dark, text size. Saved with the
// account, so the phone and the laptop match. Changes show at once.
export function AppearancePage() {
  const { data: user } = useCurrentUser();
  const save = useSaveAppearance();
  const look: Appearance = user?.appearance ?? DEFAULT_APPEARANCE;
  const change = (next: Partial<Appearance>) =>
    save.mutate({ ...look, ...next });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Colors and text size</h1>
        <p className="text-muted">
          Changes show right away and follow you to every phone and computer you
          sign in on.
        </p>
      </div>
      {save.isError && <ErrorAlert message={errorMessage(save.error)} />}

      <section aria-labelledby="mode-heading" className="flex flex-col gap-3">
        <h2 id="mode-heading" className="text-xl font-bold">
          Light or dark
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {COLOR_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            return (
              <ChoiceCard
                key={mode}
                name="mode"
                checked={look.mode === mode}
                onChange={() => change({ mode })}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Icon aria-hidden="true" className="size-5 text-brand" />
                  {COLOR_MODE_LABELS[mode]}
                </span>
                {mode === "system" && (
                  <span className="text-sm text-muted">
                    Light by day, dark at night, if your phone or computer
                    switches
                  </span>
                )}
              </ChoiceCard>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="size-heading" className="flex flex-col gap-3">
        <h2 id="size-heading" className="text-xl font-bold">
          Text size
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZES.map((size) => (
            <ChoiceCard
              key={size}
              name="size"
              checked={look.textSize === size}
              onChange={() => change({ textSize: size })}
            >
              <span
                aria-hidden="true"
                className="font-bold leading-none"
                style={{
                  fontSize: `${(TEXT_SIZE_PERCENT[size] / 100) * 1.5}rem`,
                }}
              >
                Aa
              </span>
              <span className="text-sm font-semibold">
                {TEXT_SIZE_LABELS[size]}
              </span>
            </ChoiceCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="colors-heading" className="flex flex-col gap-3">
        <h2 id="colors-heading" className="text-xl font-bold">
          Colors
        </h2>
        <p className="text-sm text-muted">
          Ready-made sets, most from popular palettes on Color Hunt. Talaan
          checks each one so text stays easy to read, in light and dark.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PALETTES.map((p) => {
            const on = look.palette === p.key;
            return (
              <ChoiceCard
                key={p.key}
                name="palette"
                checked={on}
                onChange={() => change({ palette: p.key, colors: [] })}
              >
                <Swatches colors={p.colors} />
                <span className="flex items-start justify-between gap-1">
                  <span className="flex flex-col">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">{p.meaning}</span>
                  </span>
                  {on && (
                    <Check
                      aria-hidden="true"
                      className="size-5 shrink-0 text-brand"
                    />
                  )}
                </span>
              </ChoiceCard>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          From Color Hunt:{" "}
          {PALETTES.filter((p) => p.source).map((p, i, all) => (
            <span key={p.key}>
              <a
                href={p.source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                {p.name}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
              {i < all.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <ColorHuntPaste
          current={look.palette === "custom" ? look.colors : null}
          onUse={(colors) => change({ palette: "custom", colors })}
        />
      </section>

      <section
        aria-labelledby="preview-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="preview-heading" className="text-xl font-bold">
          How it looks
        </h2>
        <LookPreview />
      </section>
    </main>
  );
}
