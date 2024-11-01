import { Exchange, mexc as MexcExchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { MexcCredentials } from '@adapters/module-exchange-provider';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { BaseApiClient, RequestsDetails } from '../BaseApiClient';
import { BalancesResponse } from '../types';

type MexcGetAccountsResponse = {
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: null | number;
  accountType: 'SPOT';
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: ['SPOT'];
};

@injectable()
export class MexcApiClient<RequiredProps> extends BaseApiClient<MexcCredentials, RequiredProps, never[]> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Mexc)
  protected provider!: ExchangeProviderModule<MexcCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: MexcExchange;
  public ccxtConstructor: Constructor<Exchange> = MexcExchange;

  constructor() {
    super();

    this.options = {
      enableRateLimit: false,
      options: {
        defaultType: 'spot',
        fetchMarkets: { types: { swap: { linear: false, inverse: false } } },
      },
    };

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'MexcApiClient');
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const balances: MexcGetAccountsResponse = await this.ccxtClient.spotPrivateGetAccount();

    const data = balances.balances.reduce(
      (acc, balance) => {
        if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');
        if (!acc[balances.accountType]) {
          acc[balances.accountType] = {};
        }

        const innerAsset = balance.asset;
        const unifiedAsset = this.ccxtClient.safeCurrencyCode(balance.asset);

        acc[balances.accountType][balance.asset] = {
          id: innerAsset,
          code: unifiedAsset,
          free: balance.free,
          used: balance.locked,
          total: (parseFloat(balance.free) + parseFloat(balance.locked)).toString(),
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

  protected async _fetchRateLimits(): Promise<never[]> {
    return [];
  }
}
