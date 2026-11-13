import { Download } from "lucide-react";
import { EXPORT_URL } from "@talaan/client";
import { buttonPrimary } from "../ui/styles";

// Everything in your own account, as one ZIP
export function DownloadSection() {
  return (
    <section
      aria-labelledby="download-heading"
      className="flex flex-col gap-3 rounded-2xl border border-edge bg-white p-5"
    >
      <h2 id="download-heading" className="text-xl font-bold">
        Download your data
      </h2>
      <p className="text-muted">
        One ZIP file with everything in your account, yours and your family
        profiles':
      </p>
      <ul className="list-disc pl-6 text-sm">
        <li>
          <strong>Open me.html</strong>: everything, easy to read and print, in
          any browser
        </li>
        <li>
          <strong>Spreadsheets</strong> of records, lab results and reminders
          (Excel or Google Sheets)
        </li>
        <li>
          <strong>Every photo and PDF</strong>, in a folder for each person
        </li>
        <li>
          <strong>A complete copy in JSON</strong>, for moving to another app
        </li>
      </ul>
      <p className="text-sm text-muted">
        Records shared with you by others are theirs, so they aren't in it. It
        can take a minute with many photos. You'll get an email that it was
        downloaded. Keep the file somewhere safe: it has private health
        information.
      </p>
      <a href={EXPORT_URL} download className={`${buttonPrimary} self-start`}>
        <Download aria-hidden="true" className="size-5" />
        Download my data
      </a>
    </section>
  );
}
