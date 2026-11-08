import qrcode from "qrcode-generator";
import { type CSSProperties, useMemo } from "react";

// A QR code drawn as squares, made here on the device (no outside service).
// "M" error correction still scans when a corner of the label gets scuffed.
export function QrCode({
  text,
  className = "",
  title,
  style,
}: {
  text: string;
  className?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const { size, path } = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { size: count, path: d };
  }, [text]);

  // A quiet border of 2 squares around it, which scanners need
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label={title ?? "QR code"}
      className={className}
      style={style}
      shapeRendering="crispEdges"
    >
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
