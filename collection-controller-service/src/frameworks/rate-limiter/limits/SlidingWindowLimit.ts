import { BaseLimit } from './BaseLimit';

export class SlidingWindowLimit extends BaseLimit {
  addUsage(amount: number) {
    this.ensureReset();
    this.used += amount;
  }

  exceedsLimit(weight: number) {
    this.ensureReset();
    return this.used + weight > this.limit;
  }

  getRetryTime(): number {
    this.ensureReset();
    if (this.used > this.limit) {
      const now = Date.now();
      return Math.ceil((this.lastReset + this.interval - now) / 1000);
    }
    return 0;
  }

  ensureReset() {
    if (Date.now() - this.lastReset > this.interval) {
      this.used = 0;
      this.lastReset = Date.now();
    }
  }
}
