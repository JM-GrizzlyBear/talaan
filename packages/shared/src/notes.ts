import { z } from "zod";

export const NOTE_LIMITS = {
  titleMax: 120,
  bodyMax: 5000,
} as const;

export const noteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Required")
    .max(NOTE_LIMITS.titleMax, `At most ${NOTE_LIMITS.titleMax} characters`),
  body: z
    .string()
    .trim()
    .max(NOTE_LIMITS.bodyMax, `At most ${NOTE_LIMITS.bodyMax} characters`)
    .default(""),
});

export type NoteInput = z.input<typeof noteInputSchema>;

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
