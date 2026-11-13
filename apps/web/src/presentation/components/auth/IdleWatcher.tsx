import { useEffect, useRef } from "react";
import { isIdle, shouldReportActivity } from "../../../application/auth/idle";
import { useLock, reportActivity } from "@talaan/client";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

// Watches for someone using the page. After the chosen minutes with nothing,
// it locks the website. While people are using it, it tells the API now and then,
// so the API doesn't lock a session that's being read.
export function IdleWatcher({
  lockAfterMinutes,
}: {
  lockAfterMinutes: number;
}) {
  // TanStack Query keeps "mutate" the same between renders
  const { mutate: lockNow } = useLock();
  const lastActivity = useRef(0);
  const lastReport = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();
    lastReport.current = Date.now();
    const markActive = () => {
      lastActivity.current = Date.now();
    };
    // Coming back to the tab counts as using it, but locks first if it was too long
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (isIdle(lastActivity.current, Date.now(), lockAfterMinutes)) {
        lockNow();
      } else {
        markActive();
      }
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (isIdle(lastActivity.current, now, lockAfterMinutes)) {
        lockNow();
        return;
      }
      if (shouldReportActivity(lastActivity.current, lastReport.current, now)) {
        lastReport.current = now;
        reportActivity().catch(() => {
          // A missed report only means the API may lock a little early
        });
      }
    }, 15 * 1000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [lockAfterMinutes, lockNow]);

  return null;
}
