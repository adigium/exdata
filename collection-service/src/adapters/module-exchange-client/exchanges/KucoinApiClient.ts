import { Exchange, kucoin as KucoinExchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { KucoinCredentials } from '@adapters/module-exchange-provider';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { BaseApiClient, RequestsDetails } from '../BaseApiClient';
import { BalancesResponse } from '../types';

interface RateLimit {
  interval: 'DAY' | 'MINUTE' | 'SECOND';
  intervalNum: number;
  limit: number;
  rateLimitType: 'ORDERS' | 'RAW_REQUESTS' | 'REQUEST_WEIGHT';
}

type KucoinGetAccountsResponse = Array<{
  id: string;
  currency: string;
  type: 'main' | 'margin' | 'trade' | 'trade_hf';
  balance: string;
  available: string;
  holds: string;
}>;

@injectable()
export class KucoinApiClient<RequiredProps> extends BaseApiClient<
  KucoinCredentials,
  RequiredProps,
  RateLimit[]
> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Kucoin)
  protected provider!: ExchangeProviderModule<KucoinCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: KucoinExchange;
  public ccxtConstructor: Constructor<Exchange> = KucoinExchange;

  constructor() {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'KucoinApiClient');

    this.options = {
      enableRateLimit: false,
    };
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const balances: KucoinGetAccountsResponse = await this.ccxtClient.privateGetAccounts();

    const data = balances.reduce(
      (acc, balance) => {
        if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

        const innerAsset = balance.currency;
        const unifiedAsset = this.ccxtClient.safeCurrencyCode(balance.currency);

        if (!acc[balance.type]) {
          acc[balance.type] = {};
        }

        acc[balance.type][balance.currency] = {
          id: innerAsset,
          code: unifiedAsset,
          free: balance.available,
          used: balance.holds,
          total: balance.balance,
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

  protected async _fetchRateLimits(): Promise<RateLimit[]> {
    // TODO: Add rate limits
    return [];
  }
}
