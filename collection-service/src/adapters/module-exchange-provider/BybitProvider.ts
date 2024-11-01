import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface BybitCredentials {
  apiKey: string;
  secret: string;
}

@injectable()
export class BybitProvider
  implements ExchangeProviderModule<BybitCredentials, RequestsDetails<ExchangeRequestContext.Bybit>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<BybitCredentials> {
    return {
      apiKey: this.configuration.BYBIT_API_KEY,
      secret: this.configuration.BYBIT_API_SECRET,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Bybit>> {
    // General IP rule = 600 req/s

    // UID, 5 req/s
    const getV5AssetCoinQueryInfoRequest: ExchangeRequestContext.Bybit = {
      endpoint: '/v5/asset/coin/query-info',
      weight: 1,
      id: this.configuration.BYBIT_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // UID, 1 req/s
    const getV5MarketInstrumentsInfoRequest: ExchangeRequestContext.Bybit = {
      endpoint: '/v5/market/instruments-info',
      weight: 1,
      id: this.configuration.BYBIT_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // UID, 5 req/s
    const getV5MarketOrderbookRequest: ExchangeRequestContext.Bybit = {
      endpoint: '/v5/market/orderbook',
      weight: 1,
      id: this.configuration.BYBIT_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // UID, 1 req/s
    const getV5AccountWalletBalanceRequest: ExchangeRequestContext.Bybit = {
      endpoint: '/v5/account/wallet-balance',
      weight: 1,
      id: this.configuration.BYBIT_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Bybit> = {
      fetchCurrencies: [getV5AssetCoinQueryInfoRequest],
      fetchDepositWithdrawFees: [getV5AssetCoinQueryInfoRequest],
      fetchMarkets: [getV5MarketInstrumentsInfoRequest],
      fetchBalances: [getV5AccountWalletBalanceRequest],
      fetchOrderBook: [getV5MarketOrderbookRequest],
      fetchRateLimits: [],
    };

    return requestDetails;
  }
}
