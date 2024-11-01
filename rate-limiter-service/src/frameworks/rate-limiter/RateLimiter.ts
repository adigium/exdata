import { Emitter } from 'strict-event-emitter';
import { RateLimitTracker } from './RateLimitTracker';
import { IntervalLimit, Limit, RequestDetails } from './types';

type RecordData = { record?: Limit };
type TrackerIdData = { trackerId: string };
type TrackerData<R> = { tracker: RateLimitTracker<R> };
type StatusData = { status: 'fail' | 'start' | 'success' };
type PayloadData<T> = { payload: RequestDetails<T> };
type BaseData<T> = T;

type Events<T> = {
  'tracker-add': [data: BaseData<TrackerIdData & StatusData & TrackerData<T>>];
  'tracker-replace': [data: BaseData<TrackerIdData & StatusData & TrackerData<T>>];
  'tracker-add-usage': [data: BaseData<TrackerIdData & StatusData & PayloadData<T> & RecordData>];
  'tracker-update-usage': [data: BaseData<TrackerIdData & StatusData & PayloadData<T> & RecordData>];
  'tracker-update-limit': [data: BaseData<TrackerIdData & StatusData & PayloadData<T> & RecordData>];
  'tracker-exceed-limit': [data: BaseData<TrackerIdData & PayloadData<T> & RecordData>];
  'request-wait': [data: BaseData<StatusData & PayloadData<T>>];
};

export abstract class RateLimiter<RequiredProps> extends Emitter<Events<RequiredProps>> {
  private trackers: Map<string, RateLimitTracker<RequiredProps>>;

  constructor() {
    super();
    this.trackers = new Map();
  }

  private setTracker(id: string, tracker: RateLimitTracker<RequiredProps>) {
    try {
      this.trackers.set(id, tracker);

      tracker.removeAllListeners();

      tracker.on('add-usage', (data) => {
        this.emit('tracker-add-usage', {
          status: data.status,
          trackerId: id,
          payload: data.payload,
          record: data.record,
        });
      });

      tracker.on('update-usage', (data) => {
        this.emit('tracker-update-usage', {
          status: data.status,
          trackerId: id,
          payload: data.payload,
          record: data.record,
        });
      });

      tracker.on('update-limit', (data) => {
        this.emit('tracker-update-limit', {
          status: data.status,
          trackerId: id,
          payload: data.payload,
          record: data.record,
        });
      });

      tracker.on('exceed-limit', (data) => {
        this.emit('tracker-exceed-limit', {
          trackerId: id,
          payload: data.payload,
          record: data.record,
        });
      });
    } catch (error: any) {
      tracker.removeAllListeners();
    }
  }

  protected getTracker(id: string) {
    return this.trackers.get(id);
  }

  protected addTracker(id: string, tracker: RateLimitTracker<RequiredProps>) {
    this.emit('tracker-add', {
      status: 'start',
      trackerId: id,
      tracker,
    });

    let trackerId = id;

    if (this.trackers.get(id)) trackerId = `${id}-copy`;

    this.setTracker(trackerId, tracker);

    this.emit('tracker-add', { status: 'success', trackerId, tracker });
  }

  protected replaceTracker(id: string, tracker: RateLimitTracker<RequiredProps>) {
    this.emit('tracker-replace', { status: 'start', trackerId: id, tracker });

    this.setTracker(id, tracker);

    this.emit('tracker-replace', { status: 'success', trackerId: id, tracker });
  }

  public async exceedsLimits(requestDetails: RequestDetails<RequiredProps>) {
    for (const tracker of this.trackers) {
      if (await tracker[1].exceedsLimit(requestDetails)) return true;
    }
    return false;
  }

  public async getRetryTime(requestDetails: RequestDetails<RequiredProps>) {
    let retryTime = 0;

    for (const tracker of this.trackers) {
      const trackerRetry = await tracker[1].getRetryTime(requestDetails);
      if (retryTime < trackerRetry) retryTime = trackerRetry;
    }

    return retryTime;
  }

  public async waitUntilAvailable(requestDetails: RequestDetails<RequiredProps>) {
    this.emit('request-wait', { status: 'start', payload: requestDetails });

    while (await this.exceedsLimits(requestDetails)) {
      const retryAfter = await this.getRetryTime(requestDetails);

      if (retryAfter > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, retryAfter);
        });
      } else {
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }

    this.emit('request-wait', { status: 'success', payload: requestDetails });
  }

  public async addUsage(requestDetails: RequestDetails<RequiredProps>) {
    for (const tracker of this.trackers) {
      await tracker[1].addUsage(requestDetails);
    }
  }

  public async updateUsage(
    requestDetails: RequestDetails<RequiredProps>,
    usage: number,
    intervals: number[],
    timestamp?: number,
  ): Promise<void> {
    for (const tracker of this.trackers) {
      await tracker[1].updateUsage(requestDetails, usage, intervals, timestamp);
    }
  }

  public async updateLimits(requestDetails: RequestDetails<RequiredProps>, limits: Record<string, number>) {
    const intervalLimits = Object.entries(limits).map(([key, value]) => ({
      interval: +key,
      limit: value,
    })) as IntervalLimit[];
    for (const tracker of this.trackers) {
      await tracker[1].updateLimit(requestDetails, undefined, intervalLimits);
    }
  }
}
