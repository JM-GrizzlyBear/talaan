import type { Clock } from "../../application/ports/Clock.js";

export class SystemClock implements Clock {
  now() {
    return new Date();
  }
}
