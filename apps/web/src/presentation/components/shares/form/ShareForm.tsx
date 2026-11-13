import {
  SHARE_LIMITS,
  type RecordSummary,
  type ShareLinkInfo,
} from "@talaan/shared";
import { Link2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  useCreateShare,
  DEFAULT_EXPIRY,
  type Expiry,
  expiryDate,
} from "@talaan/client";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { FormSection } from "../../records/form/FormSection";
import { CheckboxField } from "../../ui/CheckboxField";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { TextAreaField } from "../../ui/TextAreaField";
import { TextField } from "../../ui/TextField";
import { buttonPrimary } from "../../ui/styles";
import { ExpiryPicker } from "./ExpiryPicker";
import { MaxViewsField } from "./MaxViewsField";
import { PinChoice } from "./PinChoice";
import { type ShareChoice, WhatToShare } from "./WhatToShare";

// A new link for a doctor: who it's for, what's in it, how long it works,
// how many devices may open it, and an optional PIN
export function ShareForm({
  ownerId,
  profileId,
  records,
  initial,
  onCreated,
}: {
  ownerId: string;
  profileId: string;
  records: RecordSummary[];
  initial: ShareChoice;
  onCreated: (link: ShareLinkInfo, pin: string) => void;
}) {
  const create = useCreateShare();
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [what, setWhat] = useState(initial);
  const [expiry, setExpiry] = useState<Expiry>(DEFAULT_EXPIRY);
  const [limitViews, setLimitViews] = useState(false);
  const [maxViews, setMaxViews] = useState("1");
  const [pinOn, setPinOn] = useState(false);
  const [pin, setPin] = useState("");
  const [now] = useState(() => new Date());
  const [problems, setProblems] = useState<Record<string, string>>({});

  const error = (field: string) =>
    problems[field] ?? fieldError(create.error, field);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!recipient.trim()) found.recipient = "Who is it for? Like “Dr. Reyes”";
    if (!what.medicalId && !what.labs && what.recordIds.length === 0) {
      found.what = "Choose at least one thing to share";
    }
    const end = expiryDate(expiry, new Date());
    if ("error" in end) found.expiresAt = end.error;
    const views = Number(maxViews);
    if (
      limitViews &&
      (!Number.isInteger(views) || views < 1 || views > SHARE_LIMITS.maxViews)
    ) {
      found.maxViews = `Enter 1 to ${SHARE_LIMITS.maxViews}`;
    }
    if (pinOn && !/^\d{6}$/.test(pin)) found.pin = "Use 6 digits";
    setProblems(found);
    if (Object.keys(found).length > 0 || "error" in end) return;

    const thePin = pinOn ? pin : "";
    create.mutate(
      {
        ownerId,
        profileId,
        recipient: recipient.trim(),
        note: note.trim(),
        ...what,
        expiresAt: end.at.toISOString(),
        maxViews: limitViews ? views : null,
        pin: thePin,
      },
      { onSuccess: (link) => onCreated(link, thePin) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormSection title="Who it's for">
        <TextField
          label="Doctor or clinic"
          value={recipient}
          onChange={setRecipient}
          placeholder="Dr. Reyes, cardiologist"
          maxLength={SHARE_LIMITS.recipient}
          error={error("recipient")}
        />
        <TextAreaField
          label="A note for them (optional)"
          value={note}
          onChange={setNote}
          rows={2}
          placeholder="For my check-up on Friday. The CBC from March is the one I asked about."
          maxLength={SHARE_LIMITS.note}
          error={error("note")}
        />
      </FormSection>

      <FormSection title="What to share">
        <WhatToShare
          value={what}
          onChange={(next) => {
            setWhat(next);
            // The message goes once something is chosen
            setProblems((now) => {
              const rest = { ...now };
              delete rest.what;
              return rest;
            });
          }}
          records={records}
          error={error("what") ?? error("recordIds")}
        />
      </FormSection>

      <FormSection title="How long, and who can open it">
        <ExpiryPicker value={expiry} onChange={setExpiry} now={now} />
        {error("expiresAt") && (
          <p className="text-sm font-medium text-danger">
            {error("expiresAt")}
          </p>
        )}
        <MaxViewsField
          on={limitViews}
          value={maxViews}
          onChange={(on, value) => {
            setLimitViews(on);
            setMaxViews(value);
          }}
          error={error("maxViews")}
        />
        <PinChoice
          on={pinOn}
          pin={pin}
          onChange={(on, value) => {
            setPinOn(on);
            setPin(value);
          }}
          error={error("pin")}
        />
        <CheckboxField checked disabled onChange={() => {}}>
          <span className="font-semibold">Tell me when it's opened</span>
          <span className="block text-muted">
            By email and notification, as set in your alert settings. Every
            opening is listed on the link's page.
          </span>
        </CheckboxField>
      </FormSection>

      {create.isError && !fieldError(create.error, "recipient") && (
        <ErrorAlert message={errorMessage(create.error)} />
      )}
      <button
        type="submit"
        disabled={create.isPending}
        className={`${buttonPrimary} self-start`}
      >
        <Link2 aria-hidden="true" className="size-5" />
        {create.isPending ? "Making the link…" : "Make the link"}
      </button>
    </form>
  );
}
