import qrcode from "qrcode-generator";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";

// A QR code drawn on the phone (no outside service)
export function QrCode({
  text,
  size = 240,
  label,
}: {
  text: string;
  size?: number;
  label: string;
}) {
  const { count, path } = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(text);
    code.make();
    const n = code.getModuleCount();
    let d = "";
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (code.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { count: n, path: d };
  }, [text]);
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${count + 4} ${count + 4}`}
      accessibilityLabel={label}
    >
      <Rect x={-2} y={-2} width={count + 4} height={count + 4} fill="#ffffff" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
