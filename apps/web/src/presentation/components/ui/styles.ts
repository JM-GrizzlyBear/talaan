// Shared class names, so every button and input looks the same
export const buttonPrimary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-hover disabled:cursor-wait disabled:opacity-70";

export const buttonSecondary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-edge bg-white px-4 font-semibold hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70";

export const buttonDanger =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-danger px-4 font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-70";

export const inputBase =
  "w-full rounded-lg border bg-white px-3 text-base text-gray-900 placeholder:text-gray-400";

// Small text buttons that look like links ("Remove", "Send again")
export const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:cursor-wait disabled:opacity-70";

export const dangerLinkButton =
  "cursor-pointer text-sm font-semibold text-danger underline disabled:cursor-wait disabled:opacity-70";

// A white rounded list with lines between the rows
export const listCard =
  "flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white";
