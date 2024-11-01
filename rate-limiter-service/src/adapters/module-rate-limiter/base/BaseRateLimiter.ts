import { LoggerModule, RateLimiterModule } from '@modules';
import { color, colors, error, success } from '@frameworks/logger';
import { IntervalLimit, RateLimiter, RequestDetails } from '@frameworks/rate-limiter';

export type ExtractRequestContext<Class> = Class extends BaseRateLimiter<infer U> ? U : never;

export abstract class BaseRateLimiter<T> extends RateLimiter<T> implements RateLimiterModule<T> {
  abstract logger: LoggerModule;

  constructor() {
    super();

    const context = (request: RequestDetails<T>) =>
      `(${Object.entries(request)
        .map(
          ([key, value]) =>
            `${color(key, colors.darkBlue)}: ${color((value as number | string).toString(), colors.navy)}`,
        )
        .join(', ')})`;
    const tracker = (id: string) => color(`(${id})`, colors.customPink);
    const record = (used: number, limit: number) => `(${color(`${used} out of ${limit}`, colors.yellow)})`;

    this.on('request-wait', (data) => {
      if (data.status === 'start')
        this.logger.debug(
          `Waiting for the request ${color('started', colors.lightGrey)} ${context(data.payload)}`,
          ['RateLimiter'],
        );
      if (data.status === 'success')
        this.logger.debug(
          `Waiting for the request ${color('succeeded', colors.green)} ${context(data.payload)}`,
          ['RateLimiter'],
        );
    });

    this.on('tracker-add-usage', (data) => {
      if (data.status === 'start')
        this.logger.debug(`${tracker(data.trackerId)} Adding usage to the tracker ${context(data.payload)}`, [
          'RateLimiter',
          'Tracker',
        ]);
      if (data.status === 'fail')
        this.logger.error(
          `${tracker(data.trackerId)} ${error('Failed')} to add usage to the tracker ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
      if (data.status === 'success')
        this.logger.debug(
          `${tracker(data.trackerId)} ${success('Successfuly')} added usage to the tracker ${record(data.record!.used, data.record!.limit)} ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
    });

    this.on('tracker-exceed-limit', (data) => {
      this.logger.debug(
        `${tracker(data.trackerId)} Tracker will exceed the limit after calling ${record(data.record!.used, data.record!.limit)} ${context(data.payload)}`,
        ['RateLimiter', 'Tracker'],
      );
    });

    this.on('tracker-update-limit', (data) => {
      if (data.status === 'start')
        this.logger.debug(
          `${tracker(data.trackerId)} Updating limits of the tracker ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
      if (data.status === 'fail')
        this.logger.error(
          `${tracker(data.trackerId)} ${error('Failed')} to update limits of the tracker ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
      if (data.status === 'success')
        this.logger.debug(
          `${tracker(data.trackerId)} ${success('Successfuly')} updated the limits of the tracker ${record(data.record!.used, data.record!.limit)} ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
    });

    this.on('tracker-update-usage', (data) => {
      if (data.status === 'start')
        this.logger.debug(
          `${tracker(data.trackerId)} Updating usage of the tracker ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
      if (data.status === 'fail')
        this.logger.error(
          `${tracker(data.trackerId)} ${error('Failed')} to update usage of the tracker ${context(data.payload)}`,
          ['RateLimiter', 'Tracker'],
        );
      if (data.status === 'success')
        this.logger.debug(
          `${tracker(data.trackerId)} ${success('Successfuly')} updated usage of the tracker ${record(data.record!.used, data.record!.limit)} ${context(data.payload)} `,
          ['RateLimiter', 'Tracker'],
        );
    });
  }

  protected mapIntervalLimits = (object: Record<any, any>) =>
    Object.entries(object).map(([key, value]) => ({
      interval: this.getIntervalDuration(...this.parseInterval(key)),
      limit: value,
    })) as IntervalLimit[];

  protected parseInterval(interval: string): [number, string] {
    const intervalNum = parseInt(interval.slice(0, -1), 10);
    const intervalLetter = interval.slice(-1);
    return [intervalNum, intervalLetter];
  }

  protected getIntervalDuration(intervalNum: number, intervalLetter: string): number {
    switch (intervalLetter) {
      case 'S':
        return intervalNum * 1000;
      case 'M':
        return intervalNum * 60000;
      case 'H':
        return intervalNum * 3600000;
      case 'D':
        return intervalNum * 86400000;
      default:
        throw new Error(`Unknown interval letter: ${intervalLetter}`);
    }
  }
}
