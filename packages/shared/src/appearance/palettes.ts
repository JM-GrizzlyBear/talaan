// Ready-made color sets. Most are popular Color Hunt palettes (linked), named
// in Filipino. Any other Color Hunt palette can be pasted in too.
export interface Palette {
  key: string;
  name: string;
  // What the name means
  meaning: string;
  colors: string[];
  // The one for buttons and links, when the usual pick wouldn't suit
  brand?: string;
  // Where it's from
  source?: string;
}

const hunt = (colors: string[]) =>
  `https://colorhunt.co/palette/${colors.map((c) => c.slice(1).toLowerCase()).join("")}`;

const palette = (
  key: string,
  name: string,
  meaning: string,
  colors: string[],
  fromColorHunt = true,
): Palette => ({
  key,
  name,
  meaning,
  colors,
  ...(fromColorHunt && { source: hunt(colors) }),
});

export const PALETTES: Palette[] = [
  palette(
    "talaan",
    "Talaan",
    "The usual teal",
    ["#0e3b36", "#0e7c6b", "#e3f2ef", "#f5f6f3"],
    false,
  ),
  palette("dagat", "Dagat", "Sea", [
    "#112d4e",
    "#3f72af",
    "#dbe2ef",
    "#f9f7f7",
  ]),
  palette("gabi", "Gabi", "Night", [
    "#222831",
    "#393e46",
    "#00adb5",
    "#eeeeee",
  ]),
  palette("lawa", "Lawa", "Lake", ["#2c3333", "#395b64", "#a5c9ca", "#e7f6f2"]),
  palette("dahon", "Dahon", "Leaf", [
    "#798777",
    "#a2b29f",
    "#bdd2b6",
    "#f8ede3",
  ]),
  palette("ube", "Ube", "Purple yam", [
    "#aa96da",
    "#fcbad3",
    "#ffffd2",
    "#a8d8ea",
  ]),
  palette("takipsilim", "Takipsilim", "Sunset", [
    "#6a2c70",
    "#b83b5e",
    "#f08a5d",
    "#f9ed69",
  ]),
  palette("pista", "Pista", "Fiesta", [
    "#364f6b",
    "#3fc1c9",
    "#f5f5f5",
    "#fc5185",
  ]),
  {
    // Its pink would turn warning-red on buttons, so the soft purple leads
    ...palette("rosas", "Rosas", "Rose", [
      "#8785a2",
      "#f6f6f6",
      "#ffe2e2",
      "#ffc7c7",
    ]),
    brand: "#8785a2",
  },
];

export const DEFAULT_PALETTE = "talaan";

// A Color Hunt link, or hex codes in any form ("#222831 #393E46",
// "222831-393e46-…", "222831393e4600adb5eeeeee") → 2 to 4 colors, or null
export function parsePaletteText(text: string): string[] | null {
  const t = text.trim().toLowerCase();
  const fromLink = /colorhunt\.co\/palette\/([0-9a-f]{12,24})/.exec(t);
  const hexes: string[] = [];
  const parts = fromLink ? [fromLink[1]] : t.split(/[^0-9a-f]+/);
  for (const part of parts) {
    if (part.length > 0 && part.length % 6 === 0 && part.length <= 24) {
      hexes.push(...(part.match(/.{6}/g) ?? []));
    }
  }
  const colors = [...new Set(hexes.map((h) => `#${h}`))];
  return colors.length >= 2 && colors.length <= 4 ? colors : null;
}
