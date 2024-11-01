import { ExchangeID } from '@entities';

export type ExchangeRequestContextMap = {
  [ExchangeID.Binance]: ExchangeRequestContext.Binance;
  [ExchangeID.Bybit]: ExchangeRequestContext.Bybit;
  [ExchangeID.Gate]: ExchangeRequestContext.Gate;
  [ExchangeID.Kucoin]: ExchangeRequestContext.Kucoin;
  [ExchangeID.Mexc]: ExchangeRequestContext.Mexc;
  [ExchangeID.Poloniex]: ExchangeRequestContext.Poloniex;
};

export interface RateLimiterModule {
  addUsage<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
  ): Promise<RateLimitInfo>;

  getLimitInfo<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
  ): Promise<RateLimitInfo>;

  waitForLimit(limit: RateLimitInfo): Promise<void>;

  updateLimits<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
    limits: Record<string, number>,
  ): Promise<void>;
}
