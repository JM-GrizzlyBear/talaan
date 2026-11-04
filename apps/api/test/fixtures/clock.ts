import type { Clock } from "../../src/application/ports/Clock.js";

// A clock the tests can set and move forward (for example past a rate-limit window)
export class FakeClock implements Clock {
  constructor(private current: Date = new Date("2026-10-20T10:00:00Z")) {}

  now() {
    return new Date(this.current);
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}
