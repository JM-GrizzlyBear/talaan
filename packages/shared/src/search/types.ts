export const SEARCH_KINDS = [
  "record",
  "test",
  "medical",
  "place",
  "reminder",
  "person",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  record: "Records",
  test: "Lab tests",
  medical: "Medical ID",
  place: "Places",
  reminder: "Reminders",
  person: "Family",
};

export const SEARCH_LIMITS = {
  // Shorter than this (and not a QR code) isn't searched
  minLength: 2,
  maxLength: 100,
  // Results sent back
  results: 60,
};

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  // "Lab result · Oct 5, 2026 · St. Luke's"
  subtitle: string;
  // What matched, when it isn't the title: { label: "Notes", text: "…" }
  match: { label: string; text: string } | null;
  // Where it opens (a path in the website)
  path: string;
  // Whose it is
  ownerId: string;
  profileId: string | null;
  personName: string;
  // For newest first among equally good results
  date: string | null;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  // Found in all, before keeping the best ones
  total: number;
}
