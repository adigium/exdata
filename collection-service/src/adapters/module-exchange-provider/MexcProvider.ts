import { inject, injectable } from 'inversify';
import { ExchangeProviderModule } from '@modules';
import { RequestsDetails } from '@adapters/module-exchange-client';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

export interface MexcCredentials {
  apiKey: string;
  secret: string;
}

@injectable()
export class MexcProvider
  implements ExchangeProviderModule<MexcCredentials, RequestsDetails<ExchangeRequestContext.Mexc>>
{
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  public async getCredentials(): Promise<MexcCredentials> {
    return {
      apiKey: this.configuration.MEXC_API_KEY,
      secret: this.configuration.MEXC_API_SECRET,
    };
  }

  public async getRequestDetails(): Promise<RequestsDetails<ExchangeRequestContext.Mexc>> {
    // IP
    const spotPrivateGetCapitalConfigGetallRequest: ExchangeRequestContext.Mexc = {
      endpoint: '/api/v3/capital/config/getall',
      weight: 10,
      id: this.configuration.MEXC_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // IP
    const spotPublicGetExchangeInfoRequest: ExchangeRequestContext.Mexc = {
      endpoint: '/api/v3/exchangeInfo',
      weight: 10,
      id: this.configuration.MEXC_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // IP
    const spotPublicGetDepthRequest: ExchangeRequestContext.Mexc = {
      endpoint: '/api/v3/depth',
      weight: 10,
      id: this.configuration.MEXC_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    // IP
    const spotPrivateGetAccountRequest: ExchangeRequestContext.Mexc = {
      endpoint: '/api/v3/account',
      weight: 10,
      id: this.configuration.MEXC_UID,
      ip: this.configuration.PUBLIC_IP,
    };

    const requestDetails: RequestsDetails<ExchangeRequestContext.Mexc> = {
      fetchCurrencies: [spotPrivateGetCapitalConfigGetallRequest],
      fetchDepositWithdrawFees: [spotPrivateGetCapitalConfigGetallRequest],
      fetchMarkets: [spotPublicGetExchangeInfoRequest],
      fetchBalances: [spotPrivateGetAccountRequest],
      fetchOrderBook: [spotPublicGetDepthRequest],
      fetchRateLimits: [],
    };

    return requestDetails;
  }
}
