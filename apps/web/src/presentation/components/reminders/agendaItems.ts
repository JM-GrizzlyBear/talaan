import type { AgendaInfo } from "@talaan/shared";

type Item = AgendaInfo["items"][number];

// Earlier times not marked done or skipped
export const isMissed = (item: Item, now: Date) =>
  new Date(item.at) < now && (item.state === null || item.state === "snoozed");
