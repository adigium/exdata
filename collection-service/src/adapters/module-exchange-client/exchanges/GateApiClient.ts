import { Exchange, gate as GateExchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { GateCredentials } from '@adapters/module-exchange-provider';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { BaseApiClient, RequestsDetails } from '../BaseApiClient';
import { BalancesResponse, MarketsResponse } from '../types';

interface RateLimit {
  interval: 'DAY' | 'MINUTE' | 'SECOND';
  intervalNum: number;
  limit: number;
  rateLimitType: 'ORDERS' | 'RAW_REQUESTS' | 'REQUEST_WEIGHT';
}

type SpotGetAccountsResponse = Array<{
  currency: string;
  available: string;
  locked: string;
  update_id: number;
}>;

@injectable()
export class GateApiClient<RequiredProps> extends BaseApiClient<GateCredentials, RequiredProps, RateLimit[]> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Gate)
  protected provider!: ExchangeProviderModule<GateCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: GateExchange;
  public ccxtConstructor: Constructor<Exchange> = GateExchange;

  constructor() {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'GateApiClient');

    this.options = {
      enableRateLimit: false,
    };
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const balances: SpotGetAccountsResponse = await this.ccxtClient.privateSpotGetAccounts();

    const data = balances.reduce(
      (acc, balance) => {
        if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

        const innerAsset = balance.currency;
        const unifiedAsset = this.ccxtClient.safeCurrencyCode(balance.currency);

        if (!acc.spot) {
          acc.spot = {};
        }

        acc.spot[balance.currency] = {
          id: innerAsset,
          code: unifiedAsset,
          free: balance.available,
          used: balance.locked,
          total: (parseFloat(balance.available) + parseFloat(balance.locked)).toString(),
        };

        return acc;
      },
      {} as BalancesResponse['data'],
    );

    return {
      data,
      datetime: new Date().toISOString(),
      info: balances,
      timestamp: new Date().getTime(),
    };
  }

  protected override async _fetchMarkets(): Promise<MarketsResponse> {
    if (this.ccxtClient?.fetchSpotMarkets) {
      const markets = await this.ccxtClient.fetchSpotMarkets();
      return markets as MarketsResponse;
    }
    throw new Error('Method ccxtClient.fetchSpotMarkets is not implemented for this exchange');
  }

  protected async _fetchRateLimits(): Promise<RateLimit[]> {
    // TODO: Add rate limits
    return [];
  }
}
