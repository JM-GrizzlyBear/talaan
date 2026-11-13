// The server's own jobs: reminder alerts, and hourly chores (emptying old
// Trash, suspended accounts, old sessions).
//
// It doesn't ask the database every minute. The free database (Neon) sleeps
// after 5 minutes without queries and only has so many hours a month, so the
// server asks when the next alert is due and sleeps until then (at most an
// hour). Changing a reminder wakes it at once (poke).

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

export interface BackgroundJobs {
  // Sends due alerts; returns nothing useful
  sendAlerts: () => Promise<unknown>;
  // When the next alert is due (null: none)
  nextAlertAt: () => Promise<Date | null>;
  // Run at start, then about once an hour
  hourly: () => Promise<unknown>;
  now?: () => number;
  log?: (message: string, error: unknown) => void;
}

export function startBackgroundJobs(jobs: BackgroundJobs) {
  const now = jobs.now ?? (() => Date.now());
  const log = jobs.log ?? ((m, e) => console.error(m, e));
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let again = false;
  let stopped = false;
  let lastHourly = -Infinity;

  function schedule(delay: number) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void tick(), Math.max(SECOND, delay));
    timer.unref?.();
  }

  async function tick() {
    if (running) {
      // A poke while running: check once more right after
      again = true;
      return;
    }
    running = true;
    let next: Date | null = null;
    try {
      if (now() - lastHourly >= HOUR) {
        lastHourly = now();
        await jobs
          .hourly()
          .catch((e: unknown) => log("Hourly jobs failed:", e));
      }
      await jobs.sendAlerts();
      next = await jobs.nextAlertAt();
    } catch (error) {
      log("Couldn't send reminder alerts:", error);
      // Try again in a minute
      next = new Date(now() + 60 * SECOND);
    } finally {
      running = false;
    }
    if (again) {
      again = false;
      schedule(SECOND);
      return;
    }
    const untilHourly = lastHourly + HOUR - now();
    const untilAlert = next ? next.getTime() - now() : Infinity;
    schedule(Math.min(untilAlert, untilHourly));
  }

  void tick();

  return {
    // A reminder was added or changed: check its alerts soon
    poke: () => {
      if (running) again = true;
      else schedule(SECOND);
    },
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
