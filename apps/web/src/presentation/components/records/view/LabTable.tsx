import { formatRange, labFlag, type RecordInfo } from "@talaan/shared";

// Lab results, with Low and High marked in red
export function LabTable({ record }: { record: RecordInfo & { type: "lab" } }) {
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-2">
      <h2 id="results-heading" className="text-lg font-bold">
        Results
      </h2>
      <div className="overflow-x-auto rounded-xl border border-edge bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-page text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">
                Test
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Result
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Normal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {record.details.results.map((row, index) => {
              const flag = labFlag(row);
              return (
                <tr key={index} className={flag ? "bg-danger-soft/60" : ""}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    {row.name}
                  </th>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={flag ? "font-bold text-danger" : ""}>
                      {row.value}
                    </span>{" "}
                    <span className="text-muted">{row.unit}</span>
                    {flag && (
                      <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                        {flag === "low" ? "Low" : "High"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                    {formatRange(row) || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
