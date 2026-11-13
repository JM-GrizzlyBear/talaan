import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type PrintSettings } from "@talaan/client";

const KEY = "talaan.labelPrint";

// The paper and label size are remembered on this device (a convenience:
// it works the same when the browser keeps nothing)
function load(): PrintSettings {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(saved) as Partial<PrintSettings>),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function usePrintSettings() {
  const [settings, setSettings] = useState(load);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Not kept; nothing else changes
    }
  }, [settings]);
  return [settings, setSettings] as const;
}
