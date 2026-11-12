import type { RecordType } from "../../records/constants.js";
import type { ReadLabRow } from "../types.js";

// One thing read from the paper, for the person to check before it's used
export interface ReadField {
  value: string;
  // Why it may be wrong (empty: looks right). "Please check" on the screen.
  doubts: string[];
  // The line it came from, to compare against the photo
  line: string;
}

export interface ReadMedicine {
  name: string;
  dose: string;
  frequency: string;
  doubts: string[];
  line: string;
}

// Everything found on a printout. Anything not found is null (or empty),
// so it's left blank to fill in now or later.
export interface ReadDetails {
  type: (ReadField & { value: RecordType }) | null;
  title: ReadField | null;
  // YYYY-MM-DD
  recordDate: ReadField | null;
  doctor: ReadField | null;
  facility: ReadField | null;
  // X-ray and imaging
  bodyPart: ReadField | null;
  reading: ReadField | null;
  // Vaccination
  vaccine: ReadField | null;
  dose: ReadField | null;
  // HMO and billing ("1234.50" for amounts)
  hmo: ReadField | null;
  loaNumber: ReadField | null;
  totalAmount: ReadField | null;
  hmoCovered: ReadField | null;
  youPaid: ReadField | null;
  medicines: ReadMedicine[];
  labRows: ReadLabRow[];
}

export const DETAIL_DOUBTS = {
  hardToRead: "Hard to read on the photo",
  guessed: "Guessed: there was no label for it",
  eitherWay: (other: string) => `Read as month/day/year. Could it be ${other}?`,
  future: "This date is in the future",
  labDoctor: "Could be the lab's own doctor",
  handwritten: "Hard to read: check each word",
  shortened: "Shortened: check the full text",
} as const;
