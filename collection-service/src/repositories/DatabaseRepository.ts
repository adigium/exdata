import {
  Asset,
  ExchangeAsset,
  ExchangeAssetBalance,
  ExchangeAssetNetwork,
  Market,
  Network,
  OrderBook,
} from '@entities';

export interface DatabaseRepository {
  connect(): Promise<Failable>;
  disconnect(): Promise<Failable>;

  isHealthy(): Promise<Failable<boolean>>;

  saveAssets(assets: Array<{ _id: string } & Partial<Asset>>, upsert?: boolean): Promise<Failable>;
  saveExchangeAssets(exchangeAssets: Array<{ _id: string } & Partial<ExchangeAsset>>): Promise<Failable>;
  saveExchangeAssetNetworks(
    exchangeAssetNetworks: Array<{ _id: string } & Partial<ExchangeAssetNetwork>>,
  ): Promise<Failable>;
  saveExchangeAssetBalances(
    exchangeAssetBalances: Array<{ _id: string } & Partial<ExchangeAssetBalance>>,
  ): Promise<Failable>;
  saveNetworks(networks: Array<{ _id: string } & Partial<Network>>): Promise<Failable>;
  saveMarkets(markets: Array<{ _id: string } & Partial<Market>>): Promise<Failable>;
  saveOrderBooks(orderBooks: Array<{ _id: string } & Partial<OrderBook>>): Promise<Failable>;

  saveOrderBook(_id: string, orderBook: Partial<OrderBook>): Promise<Failable>;

  deleteOrderBooks(marketIds: string[]): Promise<Failable>;

  getAssets(): Promise<Failable<Asset[]>>;
  getOrderBook(exchange: string, symbolUnified: string): Promise<Failable<OrderBook>>;
  getMarketsActiveInnerSymbols(exchange: string): Promise<Failable<string[]>>;
  getMarketSymbolsBySymbolsInner(
    exchange: string,
    symbolsInner: string[],
  ): Promise<Failable<Pick<Market, '_id' | 'symbolInner' | 'symbolUnified'>[]>>;
  getMarketSymbolsBySymbolInner(
    exchange: string,
    symbolInner: string,
  ): Promise<Failable<Pick<Market, '_id' | 'symbolInner' | 'symbolUnified'>>>;
}
