export interface RateLimiterModule<RequestContext = any> {
  addUsage(requestDetails: RequestDetails<RequestContext>): Promise<void>;
  waitUntilAvailable(requestDetails: RequestDetails<RequestContext>): Promise<void>;
  exceedsLimits(requestDetails: RequestDetails<RequestContext>): Promise<boolean>;
  getRetryTime(requestDetails: RequestDetails<RequestContext>): Promise<number>;
  updateLimits(requestDetails: RequestDetails<RequestContext>, limits: Record<string, number>): Promise<void>;
}
