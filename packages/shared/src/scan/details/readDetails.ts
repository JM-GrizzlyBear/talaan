import { readLabLines } from "../readLabLines.js";
import type { TextLine } from "../types.js";
import { findRecordDate } from "./dates.js";
import { findFacility } from "./facility.js";
import { guessKind } from "./kind.js";
import { findDoctor } from "./people.js";
import {
  findAmounts,
  findBodyPart,
  findDose,
  findHmo,
  findLoa,
  findMedicines,
  findReading,
  findVaccine,
} from "./sections.js";
import type { ReadDetails } from "./types.js";

// Everything Talaan can find on a printout's text: what kind it is, a title,
// the date (month/day/year), doctor, hospital, and the parts for its type.
// Nothing is used until the person checks it.
export function readDetails(lines: TextLine[], today: string): ReadDetails {
  const labRows = readLabLines(lines);
  const bodyPart = findBodyPart(lines);
  const kind = guessKind(lines, labRows, bodyPart?.value ?? null);
  const type = kind?.type.value;
  const amounts =
    type === "billing"
      ? findAmounts(lines)
      : { totalAmount: null, hmoCovered: null, youPaid: null };
  return {
    type: kind?.type ?? null,
    title: kind?.title ?? null,
    recordDate: findRecordDate(lines, today),
    doctor: findDoctor(lines),
    facility: findFacility(lines),
    bodyPart: type === "imaging" ? bodyPart : null,
    reading: type === "imaging" ? findReading(lines) : null,
    vaccine: type === "vaccination" ? findVaccine(lines) : null,
    dose: type === "vaccination" ? findDose(lines) : null,
    hmo: type === "billing" ? findHmo(lines) : null,
    loaNumber: type === "billing" ? findLoa(lines) : null,
    ...amounts,
    medicines: type === "prescription" ? findMedicines(lines) : [],
    labRows: type === "lab" || type === undefined ? labRows : [],
  };
}
