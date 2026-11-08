import { NUMBER } from "./numbers.js";

// Results that are words: urinalysis, serology
const TEXT_RESULTS =
  /^(negative|positive|trace|reactive|non-?reactive|nil|none(?: seen)?|rare|few|moderate|many|occasional|clear|hazy|cloudy|turbid|slightly turbid|yellow|light yellow|dark yellow|straw|amber|red|[1-4]\+|\+{1,4})\b/i;

// The result at the start of the text: a number (maybe "<0.5"), a count
// range for urine ("0-2", only when textResults), or a word ("Negative")
export function takeValue(text: string, textResults: boolean) {
  const countRange = textResults
    ? new RegExp(String.raw`^(${NUMBER}\s*-\s*${NUMBER})`).exec(text)
    : null;
  const number = new RegExp(String.raw`^([<>]=?\s*)?(${NUMBER})`).exec(text);
  const word = TEXT_RESULTS.exec(text);
  let value = "";
  if (countRange) value = countRange[1].replace(/\s+/g, "");
  else if (number)
    value = `${number[1]?.replace(/\s+/g, "") ?? ""}${number[2]}`;
  else if (word) value = word[1];
  const match = countRange ?? number ?? word;
  if (!value || !match) return null;
  return { value, rest: text.slice(match[0].length) };
}
