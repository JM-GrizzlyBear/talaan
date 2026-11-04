// The website locks itself when nobody uses it. These rules are kept apart from
// React so they're easy to test.

// Nobody touched the page for the chosen minutes
export function isIdle(
  lastActivity: number,
  now: number,
  lockAfterMinutes: number,
) {
  return now - lastActivity >= lockAfterMinutes * 60 * 1000;
}

// Tell the API about recent activity at most every 2 minutes, and only if
// there was activity since the last report
export const REPORT_EVERY_MS = 2 * 60 * 1000;

export function shouldReportActivity(
  lastActivity: number,
  lastReport: number,
  now: number,
) {
  return lastActivity > lastReport && now - lastReport >= REPORT_EVERY_MS;
}
