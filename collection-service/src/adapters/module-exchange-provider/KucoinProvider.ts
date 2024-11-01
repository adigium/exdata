import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface KucoinCredentials {
  apiKey: string;
  secret: string;
  password: string;
}

@injectable()
export class KucoinProvider
  implements ExchangeProviderModule<KucoinCredentials, RequestsDetails<ExchangeRequestContext.Kucoin>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<KucoinCredentials> {
    return {
      apiKey: this.configuration.KUCOIN_API_KEY,
      secret: this.configuration.KUCOIN_API_SECRET,
      password: this.configuration.KUCOIN_PASSWORD,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Kucoin>> {
    const GET_CURRENCIES_KUCOIN: ExchangeRequestContext.Kucoin = {
      endpoint: '/api/v1/currencies',
      weight: 3,
      id: this.configuration.KUCOIN_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_MARKETS_KUCOIN: ExchangeRequestContext.Kucoin = {
      endpoint: '/api/v2/symbols',
      weight: 4,
      id: this.configuration.KUCOIN_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_ORDER_BOOK_KUCOIN: ExchangeRequestContext.Kucoin = {
      endpoint: '/api/v3/market/orderbook/level2',
      weight: 4,
      id: this.configuration.KUCOIN_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_ACCOUNTS_KUCOIN: ExchangeRequestContext.Kucoin = {
      endpoint: '/api/v1/accounts',
      weight: 5,
      id: this.configuration.KUCOIN_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'management',
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Kucoin> = {
      fetchCurrencies: [GET_CURRENCIES_KUCOIN],
      fetchDepositWithdrawFees: [GET_CURRENCIES_KUCOIN],
      fetchMarkets: [GET_MARKETS_KUCOIN],
      fetchBalances: [GET_ACCOUNTS_KUCOIN],
      fetchOrderBook: [GET_ORDER_BOOK_KUCOIN],
      fetchRateLimits: [],
    };

    return requestDetails;
  }
}
