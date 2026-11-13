import qrcode from "qrcode-generator";
import type { LockScreenSection } from "@talaan/client";

interface Picture {
  width: number;
  height: number;
  dark: boolean;
  name: string;
  bloodType: string;
  sections: LockScreenSection[];
  // The emergency page's address, or null for no QR
  qrText: string | null;
}

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Lays the text out at a size; returns the height it takes (drawing only
// when `draw` is true)
function layout(
  ctx: CanvasRenderingContext2D,
  p: Picture,
  scale: number,
  draw: boolean,
  left: number,
  top: number,
  width: number,
) {
  const unit = p.width / 100;
  const ink = p.dark ? "#f8fafc" : "#0f172a";
  const soft = p.dark ? "#94a3b8" : "#475569";
  const red = p.dark ? "#f87171" : "#b91c1c";
  let y = top;

  // Title bar
  const bar = 7 * unit * scale;
  if (draw) {
    ctx.fillStyle = red;
    ctx.fillRect(left, y, width, bar);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${4.2 * unit * scale}px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText("✚  MEDICAL ID", left + 3 * unit, y + bar / 2);
  }
  y += bar + 3.5 * unit * scale;

  ctx.textBaseline = "top";
  const big = 6.2 * unit * scale;
  ctx.font = `700 ${big}px ${FONT}`;
  for (const line of wrap(ctx, p.name, width)) {
    if (draw) {
      ctx.fillStyle = ink;
      ctx.fillText(line, left, y);
    }
    y += big * 1.2;
  }
  if (p.bloodType) {
    const size = 4.6 * unit * scale;
    ctx.font = `600 ${size}px ${FONT}`;
    if (draw) {
      ctx.fillStyle = ink;
      ctx.fillText(`Blood type: ${p.bloodType}`, left, y);
    }
    y += size * 1.5;
  }

  for (const section of p.sections) {
    y += 2 * unit * scale;
    const head = 3.3 * unit * scale;
    ctx.font = `700 ${head}px ${FONT}`;
    if (draw) {
      ctx.fillStyle = soft;
      ctx.fillText(section.title.toUpperCase(), left, y);
    }
    y += head * 1.45;
    for (const line of section.lines) {
      const size = 4.3 * unit * scale;
      ctx.font = `${line.strong ? 700 : 500} ${size}px ${FONT}`;
      for (const piece of wrap(ctx, line.text, width)) {
        if (draw) {
          ctx.fillStyle = line.alert ? red : ink;
          ctx.fillText(piece, left, y);
        }
        y += size * 1.3;
      }
    }
  }
  return y - top;
}

// Draws the lock screen picture: the top third left clear for the clock, the
// Medical ID below it, the QR code at the bottom
export function drawLockScreen(canvas: HTMLCanvasElement, p: Picture) {
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const unit = p.width / 100;
  ctx.fillStyle = p.dark ? "#0b1220" : "#f8fafc";
  ctx.fillRect(0, 0, p.width, p.height);

  const left = 8 * unit;
  const width = p.width - 16 * unit;
  const top = p.height * 0.33;
  const qrSize = p.qrText ? 26 * unit : 0;
  // The bottom stays clear for the swipe-up bar
  const bottom = p.height - 7 * unit - (qrSize ? qrSize + 9 * unit : 0);

  // The largest text size that fits
  let scale = 1;
  while (
    scale > 0.5 &&
    top + layout(ctx, p, scale, false, left, top, width) > bottom
  ) {
    scale -= 0.05;
  }
  layout(ctx, p, scale, true, left, top, width);

  if (p.qrText) {
    const code = qrcode(0, "M");
    code.addData(p.qrText);
    code.make();
    const count = code.getModuleCount();
    const box = qrSize;
    const x0 = p.width - left - box;
    const y0 = p.height - 7 * unit - box - 5 * unit;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0 - unit, y0 - unit, box + 2 * unit, box + 2 * unit);
    ctx.fillStyle = "#000000";
    const cell = box / count;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (code.isDark(r, c)) {
          ctx.fillRect(
            x0 + c * cell,
            y0 + r * cell,
            Math.ceil(cell),
            Math.ceil(cell),
          );
        }
      }
    }
    ctx.fillStyle = p.dark ? "#cbd5e1" : "#334155";
    ctx.font = `600 ${3.2 * unit}px ${FONT}`;
    ctx.textBaseline = "top";
    const label = ["Scan for", "emergency", "contacts"];
    label.forEach((line, i) =>
      ctx.fillText(line, left, y0 + box * 0.25 + i * 4.2 * unit),
    );
  }
}
