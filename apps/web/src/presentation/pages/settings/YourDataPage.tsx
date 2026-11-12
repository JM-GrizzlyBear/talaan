import { DeleteSection } from "../../components/yourData/DeleteSection";
import { DownloadSection } from "../../components/yourData/DownloadSection";

// /settings/data: your rights under the Data Privacy Act of 2012: a copy of
// everything, and deleting it
export function YourDataPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Your data</h1>
        <p className="text-muted">
          It's yours: take a copy any time, or delete it. Only you, the owner of
          the account, can do either.
        </p>
      </div>
      <DownloadSection />
      <DeleteSection />
    </main>
  );
}
