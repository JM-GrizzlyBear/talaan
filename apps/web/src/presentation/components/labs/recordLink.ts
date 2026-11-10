// Where a lab date leads: the record's page by default. A shared page passes
// its own ("#record-…" on the same page, or null for plain text).
export type RecordLink = (recordId: string) => string | null;
export const recordPage: RecordLink = (id) => `/records/${id}`;
