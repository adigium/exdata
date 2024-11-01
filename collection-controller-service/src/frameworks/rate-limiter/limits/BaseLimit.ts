import { Limit } from '../types';

export abstract class BaseLimit implements Limit {
  used: number = 0;
  lastReset: number;
  lastSetUpdate: number;
  limit: number;
  interval: number;

  constructor(limit: number, interval: number, used?: number) {
    this.limit = limit;
    this.interval = interval;
    this.lastReset = Date.now();
    this.lastSetUpdate = Date.now();

    if (used) this.used = used;
  }

  public setUsage(amount: number, timestamp?: number) {
    if (timestamp && timestamp > this.lastSetUpdate) {
      this.used = amount;
      this.lastSetUpdate = timestamp;
      return;
    }
    if (!timestamp) {
      this.used = amount;
      this.lastSetUpdate = Date.now();
    }
  }

  public setLimit(limit: number) {
    this.limit = limit;
  }

  abstract addUsage(amount: number): void;
  abstract exceedsLimit(weight: number): boolean;
  abstract getRetryTime(): number;
  abstract ensureReset(): void;
}
