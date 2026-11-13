import { TRUSTED_BROWSER_DAYS } from "@talaan/shared";
import { Laptop } from "lucide-react";
import {
  useForgetAllBrowsers,
  useForgetBrowser,
  useSignOutOtherDevices,
  useTrustedBrowsers,
  shortDateTime,
} from "@talaan/client";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { SectionHeading } from "../ui/SectionHeading";
import { buttonSecondary, linkButton, listCard } from "../ui/styles";

// Remembered browsers, and "Sign out everywhere else"
export function SignedInSection() {
  const browsers = useTrustedBrowsers();
  const forget = useForgetBrowser();
  const forgetAll = useForgetAllBrowsers();
  const signOutOthers = useSignOutOtherDevices();
  const list = browsers.data ?? [];
  const error = browsers.error ?? forget.error ?? forgetAll.error;

  return (
    <section aria-labelledby="devices-heading" className="flex flex-col gap-3">
      <SectionHeading id="devices-heading" icon={<Laptop className="size-5" />}>
        Browsers and devices
      </SectionHeading>
      <p className="text-sm text-muted">
        Remembered browsers skip the emailed code for {TRUSTED_BROWSER_DAYS}{" "}
        days. Forget one you no longer use, or that isn't yours.
      </p>
      {error && <ErrorAlert message={errorMessage(error)} />}
      {list.length > 0 ? (
        <ul className={listCard}>
          {list.map((browser) => (
            <li
              key={browser.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <strong className="truncate">
                  {browser.label}
                  {browser.current && (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-deep">
                      This browser
                    </span>
                  )}
                </strong>
                <span className="text-sm text-muted">
                  Last used {shortDateTime(browser.lastUsedAt)} · Remembered
                  until {shortDateTime(browser.expiresAt)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => forget.mutate(browser.id)}
                disabled={forget.isPending}
                aria-label={`Forget ${browser.label}`}
                className={linkButton}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      ) : (
        browsers.isSuccess && (
          <p className="text-sm text-muted">No remembered browsers.</p>
        )
      )}
      <div className="flex flex-wrap gap-2">
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => forgetAll.mutate()}
            disabled={forgetAll.isPending}
            className={buttonSecondary}
          >
            Forget all browsers
          </button>
        )}
        <button
          type="button"
          onClick={() => signOutOthers.mutate()}
          disabled={signOutOthers.isPending}
          className={buttonSecondary}
        >
          {signOutOthers.isPending
            ? "Signing out…"
            : "Sign out everywhere else"}
        </button>
      </div>
      {signOutOthers.isSuccess && (
        <Notice>Every other browser and device was signed out.</Notice>
      )}
      {signOutOthers.isError && (
        <ErrorAlert message={errorMessage(signOutOthers.error)} />
      )}
    </section>
  );
}
