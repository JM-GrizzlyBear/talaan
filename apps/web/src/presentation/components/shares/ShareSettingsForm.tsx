import { randomPin, SHARE_LIMITS, type ShareLinkInfo } from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { useUpdateShare } from "../../../application/shares/useShares";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";
import { type Expiry, expiryDate } from "./form/expiry";
import { ExpiryPicker } from "./form/ExpiryPicker";
import { MaxViewsField } from "./form/MaxViewsField";

type PinChange = "keep" | "new" | "remove" | "add";

// Make it last longer (or shorter), change how many devices, or the PIN
export function ShareSettingsForm({
  link,
  onDone,
}: {
  link: ShareLinkInfo;
  // pin: the new PIN to show once
  onDone: (pin?: string) => void;
}) {
  const update = useUpdateShare(link.id);
  const [now] = useState(() => new Date());
  const [expiry, setExpiry] = useState<Expiry>({ mode: "preset", key: "7d" });
  const [limitViews, setLimitViews] = useState(link.maxViews !== null);
  const [maxViews, setMaxViews] = useState(String(link.maxViews ?? 1));
  const [pinChange, setPinChange] = useState<PinChange>("keep");
  const [pin, setPin] = useState(() => randomPin());
  const [problem, setProblem] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const end = expiryDate(expiry, new Date());
    if ("error" in end) found.expiresAt = end.error;
    const views = Number(maxViews);
    if (
      limitViews &&
      (!Number.isInteger(views) || views < 1 || views > SHARE_LIMITS.maxViews)
    ) {
      found.maxViews = `Enter 1 to ${SHARE_LIMITS.maxViews}`;
    }
    const settingPin = pinChange === "new" || pinChange === "add";
    if (settingPin && !/^\d{6}$/.test(pin)) found.pin = "Use 6 digits";
    setProblem(found);
    if ("error" in end || Object.keys(found).length > 0) return;
    update.mutate(
      {
        expiresAt: end.at.toISOString(),
        maxViews: limitViews ? views : null,
        pin: settingPin ? pin : pinChange === "remove" ? "" : undefined,
      },
      { onSuccess: () => onDone(settingPin ? pin : undefined) },
    );
  };

  const pinOptions = link.hasPin
    ? [
        { value: "keep", label: "Keep the PIN" },
        { value: "new", label: "Set a new PIN" },
        { value: "remove", label: "No PIN" },
      ]
    : [
        { value: "keep", label: "No PIN" },
        { value: "add", label: "Ask for a PIN" },
      ];

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4"
    >
      <p className="text-sm text-muted">
        The new time counts from now. The link and QR stay the same.
      </p>
      <ExpiryPicker value={expiry} onChange={setExpiry} now={now} />
      {(problem.expiresAt ?? fieldError(update.error, "expiresAt")) && (
        <p className="text-sm font-medium text-danger">
          {problem.expiresAt ?? fieldError(update.error, "expiresAt")}
        </p>
      )}
      <MaxViewsField
        on={limitViews}
        value={maxViews}
        onChange={(on, value) => {
          setLimitViews(on);
          setMaxViews(value);
        }}
        error={problem.maxViews}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <SelectField
            label="PIN"
            value={pinChange}
            onChange={(v) => setPinChange(v as PinChange)}
            options={pinOptions}
          />
        </div>
        {(pinChange === "new" || pinChange === "add") && (
          <>
            <div className="w-36">
              <TextField
                label="New PIN"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(v) => setPin(v.replace(/\D/g, ""))}
                error={problem.pin}
              />
            </div>
            <button
              type="button"
              onClick={() => setPin(randomPin())}
              className={buttonSecondary}
            >
              Another
            </button>
          </>
        )}
      </div>
      {update.isError && <ErrorAlert message={errorMessage(update.error)} />}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={update.isPending}
          className={buttonPrimary}
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className={buttonSecondary}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
