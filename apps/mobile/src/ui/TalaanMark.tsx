import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

// The Talaan logo (the website's): a folder of records with a heart
export function TalaanMark({ size = 32 }: { size?: number }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Rect width={64} height={64} rx={14} fill={t.brand} />
      <Path
        d="M11 20.5a4 4 0 0 1 4-4h10.5l4 4H49a4 4 0 0 1 4 4V45a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4Z"
        fill="#ffffff"
      />
      <Path
        d="M32 44.2c-1.9-1.4-10.4-6.6-10.4-12.6 0-3.3 2.5-5.7 5.5-5.7 2.1 0 3.9 1.2 4.9 3 1-1.8 2.8-3 4.9-3 3 0 5.5 2.4 5.5 5.7 0 6-8.5 11.2-10.4 12.6Z"
        fill={t.brand}
      />
    </Svg>
  );
}
