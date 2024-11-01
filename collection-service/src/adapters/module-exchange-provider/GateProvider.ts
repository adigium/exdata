import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface GateCredentials {
  apiKey: string;
  secret: string;
}

@injectable()
export class GateProvider
  implements ExchangeProviderModule<GateCredentials, RequestsDetails<ExchangeRequestContext.Gate>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<GateCredentials> {
    return {
      apiKey: this.configuration.GATE_API_KEY,
      secret: this.configuration.GATE_API_SECRET,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Gate>> {
    const GET_ALL_COINS_REQUEST: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/spot/currencies',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_WALLET_WITHDRAWAL_STATUS_REQUEST: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/spot/currencies',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'wallet',
    };

    const GET_MARGIN_CURRENCY_PAIRS: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/margin/currency_pairs',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_SPOT_CURRENCY_PAIRS: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/spot/currency_pairs',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_ORDER_BOOK: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/spot/order_book',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'public',
    };

    const GET_SPOT_ACCOUNTS: ExchangeRequestContext.Gate = {
      endpoint: '/api/v4/spot/accounts',
      weight: 1,
      id: this.configuration.GATE_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'spot',
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Gate> = {
      fetchCurrencies: [GET_ALL_COINS_REQUEST],
      fetchDepositWithdrawFees: [GET_WALLET_WITHDRAWAL_STATUS_REQUEST],
      fetchMarkets: [GET_MARGIN_CURRENCY_PAIRS, GET_SPOT_CURRENCY_PAIRS],
      fetchBalances: [GET_SPOT_ACCOUNTS],
      fetchOrderBook: [GET_ORDER_BOOK],
      fetchRateLimits: [],
    };

    return requestDetails;
  }
}
