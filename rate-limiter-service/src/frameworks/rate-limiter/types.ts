export type Limit = {
  used: number;
  lastReset: number;
  limit: number;
  interval: number;

  addUsage: (amount: number) => void;
  setUsage: (amount: number, timestamp?: number) => void;

  setLimit: (limit: number) => void;
  exceedsLimit: (weight: number) => boolean;

  getRetryTime: () => number;
  ensureReset: () => void;
};

export type Layer<T = unknown> = {
  process(requestDetails: RequestDetails<T>): Promise<LayerResult>;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;
type ExtractRequirement<T> = T extends Layer<infer Props> ? Props : never;

export type AccumulateRequirements<Factories extends Array<() => Layer<any>>> = UnionToIntersection<
  ExtractRequirement<ReturnType<Factories[number]>>
>;

export type RequestDetails<T = unknown> = T & {};

export type LayerResult = {
  proceed: boolean;
  key?: string;
};
export type IntervalLimit = {
  interval: number;
  limit: number;
};

export type WeightLayersRequirements = {
  weight: number;
};
export type EndpointLayersRequirements = {
  endpoint: string;
};
export type IdLayersRequirements = {
  id?: string;
};
export type IpLayersRequirements = {
  ip?: string;
};
