export interface ExchangeClientModule<RequestContext = any> {
  initialize(): Promise<void>;

  fetchCurrencies: FunctionWithDetails<() => Promise<Exchange.CurrenciesResponse>, RequestContext>;
  fetchMarkets: FunctionWithDetails<() => Promise<Exchange.MarketsResponse>, RequestContext>;
  fetchBalances: FunctionWithDetails<() => Promise<Exchange.BalancesResponse>, RequestContext>;
  fetchOrderBook: FunctionWithDetails<
    (symbol: string, limit?: number) => Promise<Exchange.OrderBookResponse>,
    RequestContext
  >;
  fetchDepositWithdrawFees: FunctionWithDetails<
    () => Promise<Exchange.DepositWithdrawalFeesResponse>,
    RequestContext
  >;
  fetchRateLimits: FunctionWithDetails<() => Promise<any>, RequestContext>;

  assetInnerToUnified: (assetInner: string, networkUnified?: string) => string;
  assetUnifiedToInner: (assetUnified: string, networkUnified?: string) => string;
  networkInnerToUnified: (networkInner: string, assetUnified?: string) => string;
  networkUnifiedToInner: (networkUnified: string, assetUnified?: string) => string;
}
