import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSession } from "../auth/SessionProvider";
import { type Theme, themeFor } from "./theme";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const scheme = useColorScheme();
  const theme = useMemo(
    () => themeFor(user?.appearance, scheme === "dark"),
    [user?.appearance, scheme],
  );
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme outside ThemeProvider");
  return theme;
}
