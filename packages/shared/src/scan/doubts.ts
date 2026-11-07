// Why a row may be wrong, shown on the check screen
export const DOUBTS = {
  unknownTest: "Not a test Talaan knows: check the name",
  badRange: "The normal range looks wrong",
  hardToRead: "Hard to read on the photo",
  letterO: "A letter O was read as 0",
} as const;

// Below this (0–100), the reader wasn't sure of the letters
export const SURE_ENOUGH = 75;
