import { ACCOUNT_KEEP_DAYS } from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useSignedOut } from "../../../application/auth/useAuth";
import { deleteAccount } from "../../../infrastructure/api/yourDataApi";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { TextField } from "../ui/TextField";
import { buttonDanger } from "../ui/styles";

type Mode = "suspend" | "now";

// Deleting your own account: suspended for a year first (sign in to undo),
// or everything right away
export function DeleteSection() {
  const [mode, setMode] = useState<Mode>("suspend");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const signedOut = useSignedOut();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: deleteAccount,
    // To the goodbye page first, so the sign-in page doesn't flash
    onSuccess: async (result) => {
      await navigate(
        result.deleted
          ? "/goodbye?deleted=1"
          : `/goodbye?until=${encodeURIComponent(result.deleteAfter ?? "")}`,
        { replace: true },
      );
      signedOut();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    remove.mutate(
      mode === "now"
        ? { mode, password, confirm: confirm as "DELETE" }
        : { mode, password },
    );
  };

  const radio = (value: Mode, title: string, text: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
        mode === value ? "border-danger bg-red-50" : "border-edge"
      }`}
    >
      <input
        type="radio"
        name="delete-mode"
        checked={mode === value}
        onChange={() => setMode(value)}
        className="mt-1 size-4 accent-danger"
      />
      <span className="flex flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
    </label>
  );

  return (
    <section
      aria-labelledby="delete-heading"
      className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-5"
    >
      <h2 id="delete-heading" className="text-xl font-bold text-danger">
        Delete your account
      </h2>
      <p className="text-muted">
        Deletes your account and everything in it: your records and your family
        profiles', every photo and PDF, places, reminders, Medical IDs and
        doctor links. Family you share with lose access. Records others share
        with you stay theirs. Download your data first if you want a copy.
      </p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">How</legend>
          {radio(
            "suspend",
            `Suspend now, delete after ${ACCOUNT_KEEP_DAYS / 365} year`,
            "Nobody can see your records from now on, and you're signed out. Signing in within the year brings everything back. We'll email you at 6 months and a week before it's deleted.",
          )}
          {radio(
            "now",
            "Delete everything now",
            "Gone at once, for good. This can't be undone.",
          )}
        </fieldset>
        <div className="sm:max-w-sm">
          <TextField
            label="Your password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={fieldError(remove.error, "password")}
          />
        </div>
        {mode === "now" && (
          <div className="sm:max-w-sm">
            <TextField
              label="Type DELETE to confirm"
              autoComplete="off"
              autoCapitalize="characters"
              value={confirm}
              onChange={setConfirm}
              error={fieldError(remove.error, "confirm")}
            />
          </div>
        )}
        {remove.isError &&
          !fieldError(remove.error, "password") &&
          !fieldError(remove.error, "confirm") && (
            <ErrorAlert message={errorMessage(remove.error)} />
          )}
        <button
          type="submit"
          disabled={
            remove.isPending ||
            !password ||
            (mode === "now" && confirm !== "DELETE")
          }
          className={`${buttonDanger} self-start`}
        >
          {remove.isPending
            ? "One moment…"
            : mode === "now"
              ? "Delete everything now"
              : "Suspend my account"}
        </button>
      </form>
    </section>
  );
}
