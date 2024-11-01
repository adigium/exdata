import { Exchange, poloniex as PoloniexExchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { PoloniexCredentials } from '@adapters/module-exchange-provider';
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

type PoloniexGetAccountsBalancesResponse = Array<{
  accountId: string;
  accountType: 'SPOT';
  balances: Array<{
    currencyId: string;
    currency: string;
    available: string;
    hold: string;
  }>;
}>;

@injectable()
export class PoloniexApiClient<RequiredProps> extends BaseApiClient<
  PoloniexCredentials,
  RequiredProps,
  RateLimit[]
> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Poloniex)
  protected provider!: ExchangeProviderModule<PoloniexCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: PoloniexExchange;
  public ccxtConstructor: Constructor<Exchange> = PoloniexExchange;

  constructor() {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'PoloniexApiClient');

    this.options = {
      enableRateLimit: false,
    };
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const balances: PoloniexGetAccountsBalancesResponse = await this.ccxtClient.privateGetAccountsBalances();

    const data = balances.reduce(
      (acc, account) => {
        account.balances.forEach((balance) => {
          if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');
          if (!acc[account.accountType]) {
            acc[account.accountType] = {};
          }

          const innerAsset = balance.currency;
          const unifiedAsset = this.ccxtClient.safeCurrencyCode(balance.currency);

          acc[account.accountType][balance.currency] = {
            id: innerAsset,
            code: unifiedAsset,
            free: balance.available,
            used: balance.hold,
            total: (parseFloat(balance.available) + parseFloat(balance.hold)).toString(),
          };
        });

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
