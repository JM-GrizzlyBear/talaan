import { highlightRanges, type SearchQuery } from "@talaan/shared";

// The text with the searched words marked
export function Highlight({
  text,
  query,
}: {
  text: string;
  query: SearchQuery;
}) {
  const ranges = highlightRanges(text, query);
  if (ranges.length === 0) return <>{text}</>;
  const parts = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className="rounded-sm bg-amber-100 px-0.5 text-inherit">
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
