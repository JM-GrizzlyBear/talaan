// Reading lab results from text (a photo's or a PDF's), shared by the
// website and the phone app. Each step is its own file:
// tidyLine → findTest → takeValue → takeRange → units → doubts
export * from "./doubts.js";
export * from "./readLabLines.js";
export * from "./tests/index.js";
export * from "./types.js";
