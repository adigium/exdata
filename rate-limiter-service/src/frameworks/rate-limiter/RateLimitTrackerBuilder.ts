import { RateLimitTracker } from './RateLimitTracker';
import {
  ConditionLayer,
  CountLayer,
  EndpointGroupLayer,
  EndpointTargetLayer,
  IdLayer,
  IpLayer,
  WeightLayer,
} from './layers';
import { FixedWindowLimit, SlidingWindowLimit } from './limits';
import { AccumulateRequirements, IntervalLimit, Layer, Limit } from './types';

export class RateLimitTrackerBuilder<Factories extends Array<() => Layer<any>> = []> {
  private layerFactories: Factories;
  private limitFactory: (limit: number, interval: number) => Limit;
  private intervalLimits: IntervalLimit[];
  private trackerType: (() => CountLayer) | (() => WeightLayer);

  constructor(
    private readonly layers = [] as unknown as Factories,
    trackerType: (() => CountLayer) | (() => WeightLayer) = () => new WeightLayer(),
    limitFactory: (limit: number, interval: number) => Limit = (limit: number, interval: number) =>
      new SlidingWindowLimit(limit, interval),
    intervalLimits: IntervalLimit[] = [],
  ) {
    this.layerFactories = layers as Factories;
    this.intervalLimits = intervalLimits;
    this.limitFactory = limitFactory;
    this.trackerType = trackerType;
  }

  // Layers

  addEndpointGroupLayer(group: string) {
    const layerConstructor = () => new EndpointGroupLayer(group);
    return new RateLimitTrackerBuilder(
      [...this.layers, layerConstructor] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  addEndpointTargetLayer() {
    const layerConstructor = () => new EndpointTargetLayer();
    return new RateLimitTrackerBuilder(
      [...this.layers, layerConstructor] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  addIdLayer(defaultValue: (() => Promise<string>) | (() => string) | string) {
    const layerConstructor = () => new IdLayer(defaultValue);
    return new RateLimitTrackerBuilder(
      [...this.layers, layerConstructor] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  addIpLayer(defaultValue?: (() => Promise<string>) | (() => string) | string) {
    const layerConstructor = () => new IpLayer(defaultValue);
    return new RateLimitTrackerBuilder(
      [...this.layers, layerConstructor] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  addConditionLayer<T>(shouldProceed: (request: RequestDetails<T>) => boolean) {
    const layerConstructor = () => new ConditionLayer<T>(shouldProceed);
    return new RateLimitTrackerBuilder(
      [...this.layers, layerConstructor] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  addLayer(factory: () => Layer) {
    return new RateLimitTrackerBuilder(
      [...this.layers, factory] as const,
      this.trackerType,
      this.limitFactory,
      this.intervalLimits,
    );
  }

  useWeightType() {
    this.trackerType = () => new WeightLayer();
    return this;
  }

  useCountType() {
    this.trackerType = () => new CountLayer();
    return this;
  }

  // Algorithm

  useSlidingWindow() {
    this.limitFactory = (limit: number, interval: number) => new SlidingWindowLimit(limit, interval);
    return this;
  }

  useFixedWindow() {
    this.limitFactory = (limit: number, interval: number) => new FixedWindowLimit(limit, interval);
    return this;
  }

  // Limits

  addIntervalLimit(intervalLimit: IntervalLimit) {
    this.intervalLimits.push(intervalLimit);
    return this;
  }

  addIntervalLimits(intervalLimits: IntervalLimit[]) {
    this.intervalLimits.push(...intervalLimits);
    return this;
  }

  setIntervalLimits(intervalLimits: IntervalLimit[]) {
    this.intervalLimits = intervalLimits;
    return this;
  }

  // General

  build(): RateLimitTracker<AccumulateRequirements<Factories>> {
    const layers = [...this.layerFactories.map((constructor) => constructor()), this.trackerType()];

    return new RateLimitTracker(layers, this.intervalLimits, this.limitFactory);
  }

  static create() {
    return new this();
  }
}
