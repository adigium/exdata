import { Emitter } from 'strict-event-emitter';
import { Limit, RequestDetails } from './types';

type MethodAddUsed<T> = {
  key: string;
  used: number;
  interval: number;
  limit?: number;
  _meta: RequestDetails<T>;
};

type MethodUpdateUsed<T> = {
  key: string;
  used: number;
  interval: number;
  limit?: number;
  timestamp?: number;
  _meta: RequestDetails<T>;
};

type MethodUpdateLimit<T> = {
  key: string;
  interval: number;
  limit: number;
  _meta: RequestDetails<T>;
};

type MethodExceedsLimit<T> = {
  key: string;
  usage: number;
  _meta: RequestDetails<T>;
};

type RecordData = { record?: Limit };
type PropsData<T> = { props: T };
type StatusData = { status: 'fail' | 'start' | 'success' };
type BaseData<T> = T;

type Events<T> = {
  'add-usage': [data: BaseData<StatusData & PropsData<MethodAddUsed<T>> & RecordData>];
  'update-usage': [data: BaseData<StatusData & PropsData<MethodUpdateUsed<T>> & RecordData>];
  'update-limit': [data: BaseData<StatusData & PropsData<MethodUpdateLimit<T>> & RecordData>];
  'exceed-limit': [data: BaseData<PropsData<MethodExceedsLimit<T>> & RecordData>];
};

export class RateLimitMap<T> extends Emitter<Events<T>> {
  private map: Map<string, Limit> = new Map();

  constructor(private limitFactory: (limit: number, interval: number, used?: number) => Limit) {
    super();
  }

  addUsed(props: MethodAddUsed<T>): void {
    const EVENT_NAME = 'add-usage';

    const { key, used, interval, limit } = props;

    this.emit(EVENT_NAME, {
      status: 'start',
      props,
    });

    if (!this.map.get(key)) this.map.set(key, this.limitFactory(limit || 0, interval));

    const record = this.map.get(key);

    if (!record) {
      this.emit(EVENT_NAME, {
        status: 'fail',
        props,
      });
      return;
    }

    record.addUsage(used);

    this.emit(EVENT_NAME, { status: 'success', props, record });
  }

  updateUsed(props: MethodUpdateUsed<T>): void {
    const EVENT_NAME = 'update-usage';

    const { key, used, interval, limit, timestamp } = props;

    this.emit(EVENT_NAME, { status: 'start', props });

    if (!this.map.get(key)) {
      this.map.set(key, this.limitFactory(limit || 0, interval, used));

      this.emit(EVENT_NAME, {
        status: 'success',
        props,
        record: this.map.get(key),
      });

      return;
    }

    const record = this.map.get(key);

    if (!record) {
      this.emit(EVENT_NAME, {
        status: 'fail',
        props,
      });
      return;
    }

    record.setUsage(used, timestamp);

    this.emit(EVENT_NAME, {
      status: 'success',
      props,
      record,
    });
  }

  updateLimit(props: MethodUpdateLimit<T>): void {
    const EVENT_NAME = 'update-limit';

    const { key, limit, interval } = props;

    this.emit(EVENT_NAME, { status: 'start', props });

    if (!this.map.get(key)) {
      this.map.set(key, this.limitFactory(limit, interval));

      this.emit(EVENT_NAME, {
        status: 'success',
        props,
        record: this.map.get(key),
      });

      return;
    }

    const record = this.map.get(key);

    if (!record) {
      this.emit(EVENT_NAME, { status: 'fail', props });
      return;
    }

    record.setLimit(limit);

    this.emit(EVENT_NAME, { status: 'success', props, record });
  }

  exceedsLimit(props: MethodExceedsLimit<T>): boolean {
    const EVENT_NAME = 'exceed-limit';

    const { key, usage } = props;

    const record = this.map.get(key);
    if (!record) return false;

    const exceeds = record.exceedsLimit(usage);

    if (exceeds) this.emit(EVENT_NAME, { props, record });

    return exceeds;
  }

  getRecord(key: string) {
    return this.map.get(key);
  }

  getRecords() {
    return this.map;
  }
}
