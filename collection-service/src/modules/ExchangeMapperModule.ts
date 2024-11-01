import {
  Asset,
  ExchangeAsset,
  ExchangeAssetBalance,
  ExchangeAssetNetwork,
  Market,
  Network,
  OrderBook,
} from '@entities';
import {
  BalancesResponse,
  CurrenciesResponse,
  DepositWithdrawalFeesResponse,
  MarketsResponse,
  OrderBookResponse,
} from '@adapters/module-exchange-client/types';

export type Id = { _id: string };

export type UpdateRecord<T> = Id & Partial<T>;

export type MapperOutput = {
  networks?: UpdateRecord<Network>[];
  assets?: UpdateRecord<Asset>[];
  exchangeAssets?: UpdateRecord<ExchangeAsset>[];
  exchangeAssetBalances?: ExchangeAssetBalance[];
  exchangeAssetNetworks?: UpdateRecord<ExchangeAssetNetwork>[];
  markets?: UpdateRecord<Market>[];
  orderBooks?: OrderBook[];
};

export interface ExchangeMapperModule {
  mapCurrencies: (currencies: CurrenciesResponse) => MapperOutput;
  mapCurrenciesNetworks: (currencies: CurrenciesResponse) => MapperOutput;
  mapDepositWithdrawNetworks: (fees: DepositWithdrawalFeesResponse) => MapperOutput;
  mapMarkets: (marketsRes: MarketsResponse) => MapperOutput;
  mapBalances: (balancesRes: BalancesResponse) => MapperOutput;
  mapOrderBooks(orderBooksRes: OrderBookResponse[]): MapperOutput;
}
