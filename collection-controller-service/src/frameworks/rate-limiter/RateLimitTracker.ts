import { Emitter } from 'strict-event-emitter';
import { RateLimitMap } from './RateLimitMap';
import { CountLayer } from './layers/CountLayer';
import { WeightLayer } from './layers/WeightLayer';
import { IntervalLimit, Layer, Limit, RequestDetails } from './types';

type PayloadData<T> = { payload: RequestDetails<T> };
type RecordData = { record?: Limit };
type StatusData = { status: 'fail' | 'start' | 'success' };
type BaseData<T> = T;

type Events<T> = {
  'add-usage': [data: BaseData<StatusData & RecordData & PayloadData<T>>];
  'update-usage': [data: BaseData<StatusData & RecordData & PayloadData<T>>];
  'update-limit': [data: BaseData<StatusData & RecordData & PayloadData<T>>];
  'exceed-limit': [data: BaseData<RecordData & PayloadData<T>>];
};

export class RateLimitTracker<RequiredProps> extends Emitter<Events<RequiredProps>> {
  private layers: Array<Layer<any>>;
  private records: RateLimitMap<RequiredProps>;
  private intervalLimits: IntervalLimit[];

  constructor(
    layers: Array<Layer<any>>,
    intervalLimits: IntervalLimit[],
    recordConstructor: (limit: number, interval: number, used?: number) => Limit,
  ) {
    super();
    this.layers = layers;
    this.intervalLimits = intervalLimits;
    this.records = new RateLimitMap(recordConstructor);

    this.records.on('add-usage', (data) => {
      this.emit('add-usage', {
        status: data.status,
        payload: data.props._meta,
        record: data.record,
      });
    });

    this.records.on('update-usage', (data) => {
      this.emit('update-usage', {
        status: data.status,
        payload: data.props._meta,
        record: data.record,
      });
    });

    this.records.on('update-limit', (data) => {
      this.emit('update-limit', {
        status: data.status,
        payload: data.props._meta,
        record: data.record,
      });
    });

    this.records.on('exceed-limit', (data) => {
      this.emit('exceed-limit', {
        payload: data.props._meta,
        record: data.record,
      });
    });
  }

  getRecords() {
    return this.records.getRecords();
  }

  getLayers() {
    return this.layers.map((layer) => layer.constructor.name);
  }

  async getKey(requestDetails: RequestDetails<RequiredProps>): Promise<null | string> {
    const layers = this.layers;

    let key = '';

    for (const layer of layers) {
      const { proceed, key: layerKey } = await layer.process(requestDetails);

      if (!proceed) return null;
      if (!layerKey) continue;

      key = key ? `${key}-${layerKey}` : layerKey;
    }

    return key || 'global';
  }

  async addUsage(
    requestDetails: RequestDetails<RequiredProps>,
    amount?: number,
    intervals?: IntervalLimit[] | number[],
  ): Promise<void> {
    const key = await this.getKey(requestDetails);

    if (!key) return;

    if (intervals) {
      for (const interval of intervals) {
        if (typeof interval === 'number') {
          this.records.addUsed({
            key: `${key}-${interval}`,
            used: amount || this.getUsageAmount(requestDetails),
            interval,
            limit: this.intervalLimits.find((intervalLimit) => intervalLimit.interval === interval)?.limit,
            _meta: requestDetails,
          });
          continue;
        }

        this.records.addUsed({
          key: `${key}-${interval.interval}`,
          used: amount || this.getUsageAmount(requestDetails),
          interval: interval.interval,
          limit: interval.limit,
          _meta: requestDetails,
        });
      }
      return;
    }

    for (const interval of this.intervalLimits) {
      this.records.addUsed({
        key: `${key}-${interval.interval}`,
        used: amount || this.getUsageAmount(requestDetails),
        limit: interval.limit,
        interval: interval.interval,
        _meta: requestDetails,
      });
    }
  }

  async updateUsage(
    requestDetails: RequestDetails<RequiredProps>,
    amount: number,
    intervals?: IntervalLimit[] | number[],
    timestamp?: number,
  ): Promise<void> {
    const key = await this.getKey(requestDetails);

    if (!key) return;

    if (intervals) {
      for (const interval of intervals) {
        if (typeof interval === 'number') {
          this.records.updateUsed({
            key: `${key}-${interval}`,
            used: amount,
            interval,
            limit: this.intervalLimits.find((intervalLimit) => intervalLimit.interval === interval)?.limit,
            timestamp,
            _meta: requestDetails,
          });
          continue;
        }

        this.records.updateUsed({
          key: `${key}-${interval.interval}`,
          used: amount,
          interval: interval.interval,
          limit: interval.limit,
          timestamp,
          _meta: requestDetails,
        });
      }
      return;
    }

    for (const interval of this.intervalLimits) {
      this.records.updateUsed({
        key: `${key}-${interval.interval}`,
        used: amount,
        limit: interval.limit,
        interval: interval.interval,
        timestamp,
        _meta: requestDetails,
      });
    }
  }

  async updateLimit(
    requestDetails: RequestDetails<RequiredProps>,
    amount?: number,
    intervals?: IntervalLimit[] | number[],
  ): Promise<void> {
    const key = await this.getKey(requestDetails);

    if (!key) return;

    if (intervals) {
      for (const interval of intervals) {
        if (typeof interval === 'number') {
          if (!amount) continue;
          this.records.updateLimit({
            key: `${key}-${interval}`,
            limit: amount,
            interval,
            _meta: requestDetails,
          });
          continue;
        }
        this.records.updateLimit({
          key: `${key}-${interval.interval}`,
          limit: interval.limit,
          interval: interval.interval,
          _meta: requestDetails,
        });
      }
      return;
    }

    for (const interval of this.intervalLimits) {
      this.records.updateLimit({
        key: `${key}-${interval.interval}`,
        limit: interval.limit,
        interval: interval.interval,
        _meta: requestDetails,
      });
    }
  }

  async exceedsLimit(requestDetails: RequestDetails<RequiredProps>): Promise<boolean> {
    const key = await this.getKey(requestDetails);

    if (!key) return false;

    const intervals = this.intervalLimits;

    for (const interval of intervals) {
      const keyInterval = `${key}-${interval.interval}`;
      if (
        this.records.exceedsLimit({
          key: keyInterval,
          usage: this.getUsageAmount(requestDetails),
          _meta: requestDetails,
        })
      )
        return true;
    }
    return false;
  }

  async getRetryTime(requestDetails: RequestDetails<RequiredProps>): Promise<number> {
    const key = await this.getKey(requestDetails);

    if (!key) return 0;

    const intervals = this.intervalLimits;

    let resetTime = 0;

    for (const interval of intervals) {
      const keyInterval = `${key}-${interval.interval}`;
      const record = this.records.getRecord(keyInterval);

      if (!record) continue;

      if (resetTime < record.getRetryTime()) resetTime = record.getRetryTime();
    }

    return resetTime;
  }

  private getUsageAmount(requestDetails: RequestDetails<RequiredProps>) {
    if (this.isWeightTracker()) {
      if ((requestDetails as any).weight === undefined)
        throw new Error('No weight was provided for weighted rate limiter');
      return (requestDetails as any).weight;
    }
    if (this.isCountTracker()) {
      return 1;
    }
    throw new Error('The tracker does not have any kind of usage type');
  }

  private isCountTracker() {
    return !!this.layers.find((layer) => layer instanceof CountLayer);
  }

  private isWeightTracker() {
    return !!this.layers.find((layer) => layer instanceof WeightLayer);
  }
}
