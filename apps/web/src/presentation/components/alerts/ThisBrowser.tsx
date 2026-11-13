import type { AlertSettingsInfo } from "@talaan/shared";
import { BellRing } from "lucide-react";
import { useTurnOnThisBrowser } from "../../../application/reminders/useAlertSettings";
import { ApiError } from "@talaan/client";
import { pushSupport } from "../../../infrastructure/push/browserPush";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { buttonPrimary } from "../ui/styles";

// Turning notifications on in the browser being used now
export function ThisBrowser({
  settings,
  isOn,
}: {
  settings: AlertSettingsInfo;
  isOn: boolean;
}) {
  const turnOn = useTurnOnThisBrowser();
  const support = pushSupport();

  if (!settings.pushKey) {
    return (
      <Notice>
        Browser notifications aren't set up on this Talaan yet. Alerts come by
        email.
      </Notice>
    );
  }
  if (support === "home-screen") {
    return (
      <Notice>
        On iPhone and iPad, notifications work once Talaan is on the Home
        Screen: tap Share, then “Add to Home Screen”, open Talaan from there,
        and come back to this page.
      </Notice>
    );
  }
  if (support === "no") {
    return (
      <Notice>
        This browser can't show notifications. Alerts still come by email.
      </Notice>
    );
  }
  if (isOn) {
    return (
      <p className="flex items-center gap-2 font-semibold text-deep">
        <BellRing aria-hidden="true" className="size-5 text-brand" />
        Notifications are on in this browser.
      </p>
    );
  }
  const blocked =
    typeof Notification !== "undefined" && Notification.permission === "denied";
  return (
    <div className="flex flex-col gap-2">
      {turnOn.isError && (
        <ErrorAlert
          message={
            turnOn.error instanceof ApiError
              ? errorMessage(turnOn.error)
              : "This browser couldn't turn notifications on. Private or incognito windows can't; try a normal window, or another browser."
          }
        />
      )}
      {!turnOn.isError && (blocked || turnOn.data === false) && (
        <Notice>
          This browser is set to block Talaan's notifications. Allow them in the
          browser's site settings (the icon left of the address), then try
          again.
        </Notice>
      )}
      <button
        type="button"
        onClick={() => settings.pushKey && turnOn.mutate(settings.pushKey)}
        disabled={turnOn.isPending}
        className={`${buttonPrimary} self-start`}
      >
        <BellRing aria-hidden="true" className="size-4" />
        {turnOn.isPending
          ? "Asking the browser…"
          : "Turn on notifications in this browser"}
      </button>
    </div>
  );
}
