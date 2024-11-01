import { binance as BinanceExchange, Exchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { BinanceCredentials } from '@adapters/module-exchange-provider';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { BaseApiClient, RequestsDetails } from '../BaseApiClient';
import { BalancesResponse } from '../types';

interface RateLimitData {
  rateLimits: RateLimit[];
  serverTime: number;
  timezone: string;
}

interface RateLimit {
  interval: 'DAY' | 'MINUTE' | 'SECOND';
  intervalNum: number;
  limit: number;
  rateLimitType: 'ORDERS' | 'RAW_REQUESTS' | 'REQUEST_WEIGHT';
}

@injectable()
export class BinanceApiClient<RequiredProps> extends BaseApiClient<
  BinanceCredentials,
  RequiredProps,
  RateLimit[]
> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Binance)
  protected provider!: ExchangeProviderModule<BinanceCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: BinanceExchange;
  public ccxtConstructor: Constructor<Exchange> = BinanceExchange;

  constructor() {
    super();

    this.options = {
      enableRateLimit: false,
      options: {
        defaultType: 'spot',
        fetchMarkets: ['spot'],
      },
    };

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BinanceApiClient');
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const account: {
      accountType: string;
      updateTime: number;
      balances: {
        asset: string;
        free: string;
        locked: string;
      }[];
    } = await this.ccxtClient.privateGetAccount();

    const { balances, updateTime, accountType } = account;

    const data = balances.reduce(
      (acc, item) => {
        if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

        const innerAsset = item.asset;
        const unifiedAsset = this.ccxtClient.safeCurrencyCode(item.asset);

        if (!acc[accountType]) {
          acc[accountType] = {};
        }

        acc[accountType][unifiedAsset] = {
          id: innerAsset,
          code: unifiedAsset,
          free: item.free,
          used: item.locked,
          total: (parseFloat(item.free) + parseFloat(item.locked)).toString(),
        };
        return acc;
      },
      { [accountType]: {} } as BalancesResponse['data'],
    );

    return {
      data,
      datetime: new Date(updateTime).toISOString(),
      info: account,
      timestamp: updateTime,
    };
  }

  protected async _fetchRateLimits(): Promise<RateLimit[]> {
    const { data } = await this.httpClient.get<RateLimitData>({
      url: 'https://api.binance.com/api/v3/exchangeInfo',
    });
    return data.rateLimits;
  }
}
