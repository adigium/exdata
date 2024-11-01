import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface BinanceCredentials {
  apiKey: string;
  secret: string;
}

@injectable()
export class BinanceProvider
  implements ExchangeProviderModule<BinanceCredentials, RequestsDetails<ExchangeRequestContext.Binance>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<BinanceCredentials> {
    return {
      apiKey: this.configuration.BINANCE_API_KEY,
      secret: this.configuration.BINANCE_API_SECRET,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Binance>> {
    const GET_ALL_COINS_REQUEST: ExchangeRequestContext.Binance = {
      endpoint: '/sapi/v1/capital/config/getall',
      weight: 10,
      id: this.configuration.BINANCE_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const GET_EXCHANGE_INFO: ExchangeRequestContext.Binance = {
      endpoint: '/api/v3/exchangeInfo',
      weight: 20,
      id: this.configuration.BINANCE_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const GET_ORDER_BOOK: ExchangeRequestContext.Binance = {
      endpoint: '/api/v3/depth',
      weight: 250,
      id: this.configuration.BINANCE_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const GET_ACCOUNT: ExchangeRequestContext.Binance = {
      endpoint: '/api/v3/account',
      weight: 20,
      id: this.configuration.BINANCE_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Binance> = {
      fetchCurrencies: [GET_ALL_COINS_REQUEST],
      fetchDepositWithdrawFees: [GET_EXCHANGE_INFO, GET_ALL_COINS_REQUEST],
      fetchMarkets: [GET_EXCHANGE_INFO, GET_ALL_COINS_REQUEST],
      fetchBalances: [GET_ACCOUNT],
      fetchOrderBook: [GET_ORDER_BOOK],
      fetchRateLimits: [GET_EXCHANGE_INFO],
    };

    return requestDetails;
  }
}
