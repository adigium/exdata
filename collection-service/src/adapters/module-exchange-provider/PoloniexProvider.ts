import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface PoloniexCredentials {
  apiKey: string;
  secret: string;
}

@injectable()
export class PoloniexProvider
  implements ExchangeProviderModule<PoloniexCredentials, RequestsDetails<ExchangeRequestContext.Poloniex>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<PoloniexCredentials> {
    return {
      apiKey: this.configuration.POLONIEX_API_KEY,
      secret: this.configuration.POLONIEX_API_SECRET,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Poloniex>> {
    const GET_CURRENCIES_POLONIEX: ExchangeRequestContext.Poloniex = {
      endpoint: '/currencies',
      weight: 1,
      id: this.configuration.POLONIEX_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public-10',
    };

    const GET_MARKETS_POLONIEX: ExchangeRequestContext.Poloniex = {
      endpoint: '/markets',
      weight: 1,
      id: this.configuration.POLONIEX_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public-10',
    };

    const GET_ORDER_BOOK_POLONIEX: ExchangeRequestContext.Poloniex = {
      endpoint: '/markets/{symbol}/orderBook',
      weight: 1,
      id: this.configuration.POLONIEX_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public-200',
    };

    const GET_ACCOUNTS_BALANCES_POLONIEX: ExchangeRequestContext.Poloniex = {
      endpoint: '/accounts/balances',
      weight: 1,
      id: this.configuration.POLONIEX_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'private-light',
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Poloniex> = {
      fetchCurrencies: [GET_CURRENCIES_POLONIEX],
      fetchDepositWithdrawFees: [GET_CURRENCIES_POLONIEX],
      fetchMarkets: [GET_MARKETS_POLONIEX],
      fetchBalances: [GET_ACCOUNTS_BALANCES_POLONIEX],
      fetchOrderBook: [GET_ORDER_BOOK_POLONIEX],
      fetchRateLimits: [],
    };

    return requestDetails;
  }
}
