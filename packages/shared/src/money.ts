// "₱45,210.50", or null when there's no amount
export function formatPesos(value: number | null) {
  if (value === null) return null;
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
