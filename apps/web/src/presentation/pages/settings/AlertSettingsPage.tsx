import { Mail, Monitor, Send } from "lucide-react";
import {
  useAlertSettings,
  useRemoveDevice,
  useSaveAlertSettings,
  useSendTestPush,
  useThisBrowser,
} from "../../../application/reminders/useAlertSettings";
import { ThisBrowser } from "../../components/alerts/ThisBrowser";
import { BackLink } from "../../components/ui/BackLink";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { Notice } from "../../components/ui/Notice";
import {
  buttonSecondary,
  dangerLinkButton,
  listCard,
} from "../../components/ui/styles";
import { shortDate } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

// /settings/alerts: your own reminder alerts, for every reminder you see
export function AlertSettingsPage() {
  const settings = useAlertSettings();
  const thisBrowser = useThisBrowser();
  const save = useSaveAlertSettings();
  const remove = useRemoveDevice();
  const test = useSendTestPush();

  if (settings.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (settings.isError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ErrorAlert message={errorMessage(settings.error)} />
      </main>
    );
  }
  const s = settings.data;
  const endpoint = thisBrowser.data ?? null;
  const isThis = (tail: string) => Boolean(endpoint?.endsWith(tail));
  const thisIsOn = s.devices.some((d) => isThis(d.endpointTail));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to="/reminders">Back to reminders</BackLink>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">My alerts</h1>
        <p className="text-muted">
          Only for you: the family keep their own. You can also turn alerts off
          for one reminder on its page.
        </p>
      </div>
      {save.isError && <ErrorAlert message={errorMessage(save.error)} />}

      <section className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Mail aria-hidden="true" className="size-5 text-brand" />
          Email
        </h2>
        <CheckboxField
          checked={s.email}
          onChange={(email) => save.mutate({ email, push: s.push })}
        >
          Send reminder alerts to my email
        </CheckboxField>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Monitor aria-hidden="true" className="size-5 text-brand" />
          Browser notifications
        </h2>
        <CheckboxField
          checked={s.push}
          onChange={(push) => save.mutate({ email: s.email, push })}
        >
          Show reminder alerts as notifications in my browsers
        </CheckboxField>
        {s.push && <ThisBrowser settings={s} isOn={thisIsOn} />}

        {s.devices.length > 0 && (
          <>
            <h3 className="mt-2 text-sm font-semibold">
              Browsers with notifications on
            </h3>
            <ul className={listCard}>
              {s.devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">
                      {device.label || "A browser"}
                      {isThis(device.endpointTail) && (
                        <span className="ml-2 text-sm font-normal text-muted">
                          (this one)
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted">
                      Since {shortDate(device.createdAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      remove.mutate({
                        id: device.id,
                        isThisBrowser: isThis(device.endpointTail),
                      })
                    }
                    disabled={remove.isPending}
                    className={dangerLinkButton}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={test.isPending}
              className={`${buttonSecondary} self-start`}
            >
              <Send aria-hidden="true" className="size-4" />
              Send a test notification
            </button>
            {test.data !== undefined && (
              <Notice>
                {test.data > 0
                  ? `Sent to ${test.data} ${test.data === 1 ? "browser" : "browsers"}. It should show in a few seconds.`
                  : "No browser could be reached. Turn notifications on again in this browser."}
              </Notice>
            )}
            {test.isError && <ErrorAlert message={errorMessage(test.error)} />}
          </>
        )}
      </section>
    </main>
  );
}
