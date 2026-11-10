import type { Medicine } from "@talaan/shared";
import { useId } from "react";
import { listCard } from "../../ui/styles";

// A prescription's medicines, one per row
export function MedicinesList({ medicines }: { medicines: Medicine[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-lg font-bold">
        Medicines
      </h2>
      <ul className={listCard}>
        {medicines.map((m, index) => (
          <li key={index} className="flex flex-col px-4 py-3">
            <strong>{m.name}</strong>
            <span className="text-sm text-muted">
              {[m.dose, m.frequency].filter(Boolean).join(" · ") ||
                "No dose written"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
