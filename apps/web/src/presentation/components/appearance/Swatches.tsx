// A row of color strips
export function Swatches({
  colors,
  className = "h-10",
}: {
  colors: string[];
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex w-full overflow-hidden rounded-lg ring-1 ring-black/10 ${className}`}
    >
      {colors.map((color, i) => (
        <span
          key={`${color}-${i}`}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}
