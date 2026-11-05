// "Loading…" while a page waits for the API (announced to screen readers)
export function Loading({ className = "text-muted" }: { className?: string }) {
  return (
    <p role="status" className={className}>
      Loading…
    </p>
  );
}
