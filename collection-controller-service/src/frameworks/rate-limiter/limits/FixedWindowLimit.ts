import { BaseLimit } from './BaseLimit';

export class FixedWindowLimit extends BaseLimit {
  constructor(limit: number, interval: number, used?: number) {
    super(limit, interval, used);
    this.lastReset = this.getCurrentWindowStart();
  }

  addUsage(amount: number): void {
    this.ensureReset();
    this.used += amount;
  }

  exceedsLimit(weight: number): boolean {
    this.ensureReset();
    return this.used + weight > this.limit;
  }

  getRetryTime(): number {
    if (this.exceedsLimit(0)) {
      return this.lastReset + this.interval - Date.now();
    }
    return 0;
  }

  ensureReset(): void {
    const currentWindowStart = this.getCurrentWindowStart();
    if (this.lastReset < currentWindowStart) {
      this.used = 0;
      this.lastReset = currentWindowStart;
    }
  }

  private getCurrentWindowStart(): number {
    const now = Date.now();
    return now - (now % this.interval);
  }
}
