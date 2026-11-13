import { afterEach, describe, expect, it, vi } from "vitest";
import { startBackgroundJobs } from "../../src/scheduler/backgroundJobs.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

afterEach(() => {
  vi.useRealTimers();
});

function setup(nextIn: number | null) {
  vi.useFakeTimers({ now: new Date("2026-11-13T00:00:00Z") });
  const calls = { alerts: 0, hourly: 0, next: 0 };
  let next = nextIn;
  const jobs = startBackgroundJobs({
    sendAlerts: async () => {
      calls.alerts++;
    },
    nextAlertAt: async () => {
      calls.next++;
      return next === null ? null : new Date(Date.now() + next);
    },
    hourly: async () => {
      calls.hourly++;
    },
    log: () => {},
  });
  return {
    calls,
    jobs,
    setNext: (ms: number | null) => {
      next = ms;
    },
  };
}

describe("the server's background jobs", () => {
  it("leaves the database alone until the next alert is due", async () => {
    const t = setup(25 * MINUTE);
    await vi.advanceTimersByTimeAsync(0);
    expect(t.calls).toEqual({ alerts: 1, hourly: 1, next: 1 });
    // Not every minute
    await vi.advanceTimersByTimeAsync(24 * MINUTE);
    expect(t.calls.alerts).toBe(1);
    await vi.advanceTimersByTimeAsync(1 * MINUTE);
    expect(t.calls.alerts).toBe(2);
    t.jobs.stop();
  });

  it("with no alerts coming, wakes only once an hour", async () => {
    const t = setup(null);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(HOUR - 1000);
    expect(t.calls).toEqual({ alerts: 1, hourly: 1, next: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.calls).toEqual({ alerts: 2, hourly: 2, next: 2 });
    await vi.advanceTimersByTimeAsync(5 * HOUR);
    expect(t.calls.hourly).toBe(7);
    t.jobs.stop();
  });

  it("checks soon after a reminder changes", async () => {
    const t = setup(null);
    await vi.advanceTimersByTimeAsync(0);
    t.setNext(2 * MINUTE);
    t.jobs.poke();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.calls.alerts).toBe(2);
    await vi.advanceTimersByTimeAsync(2 * MINUTE);
    expect(t.calls.alerts).toBe(3);
    t.jobs.stop();
  });

  it("tries again in a minute when sending fails", async () => {
    vi.useFakeTimers();
    let runs = 0;
    const jobs = startBackgroundJobs({
      sendAlerts: async () => {
        runs++;
        if (runs === 1) throw new Error("database asleep");
      },
      nextAlertAt: async () => null,
      hourly: async () => {},
      log: () => {},
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(runs).toBe(1);
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(runs).toBe(2);
    jobs.stop();
  });
});
