import { bybit as BybitExchange, Exchange } from 'ccxt';
import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import { BybitCredentials } from '@adapters/module-exchange-provider';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { BaseApiClient, RequestsDetails } from '../BaseApiClient';
import { BalancesResponse } from '../types';

type BybitBalancesResponse = {
  retCode: number;
  retMsg: string;
  result?: {
    list: Array<{
      totalEquity: string;
      accountIMRate: string;
      totalMarginBalance: string;
      totalInitialMargin: string;
      accountType: string;
      totalAvailableBalance: string;
      accountMMRate: string;
      totalPerpUPL: string;
      totalWalletBalance: string;
      accountLTV: string;
      totalMaintenanceMargin: string;
      coin: Array<{
        availableToBorrow: string;
        bonus: string;
        accruedInterest: string;
        availableToWithdraw: string;
        totalOrderIM: string;
        equity: string;
        totalPositionMM: string;
        usdValue: string;
        spotHedgingQty: string;
        unrealisedPnl: string;
        collateralSwitch: boolean;
        borrowAmount: string;
        totalPositionIM: string;
        walletBalance: string;
        cumRealisedPnl: string;
        locked: string;
        marginCollateral: boolean;
        coin: string;
      }>;
    }>;
  };
  time: number;
};

@injectable()
export class BybitApiClient<RequiredProps> extends BaseApiClient<BybitCredentials, RequiredProps, never[]> {
  protected logger: LoggerModule;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeProviderModule)
  @named(ExchangeID.Bybit)
  protected provider!: ExchangeProviderModule<BybitCredentials, RequestsDetails<RequiredProps>>;

  public ccxtClient?: BybitExchange;
  public ccxtConstructor: Constructor<Exchange> = BybitExchange;

  constructor() {
    super();

    this.options = {
      enableRateLimit: false,
      options: {
        defaultType: 'spot',
        fetchMarkets: ['spot'],
      },
    };

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BybitApiClient');
  }

  protected async _fetchBalances(): Promise<BalancesResponse> {
    if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

    const { time, result }: BybitBalancesResponse = await this.ccxtClient.privateGetV5AccountWalletBalance({
      accountType: 'UNIFIED',
    });

    if (!result) throw new Error('Failed to fetch balances');

    const balances = result.list.reduce(
      (acc, accountBalances) => {
        const { coin: coins } = accountBalances;

        coins.forEach((coin) => {
          if (!this.ccxtClient) throw new Error('Exchange API client was not initialized');

          const innerAsset = coin.coin;
          const unifiedAsset = this.ccxtClient.safeCurrencyCode(coin.coin);

          if (!acc[accountBalances.accountType]) {
            acc[accountBalances.accountType] = {};
          }

          acc[accountBalances.accountType][coin.coin] = {
            id: innerAsset,
            code: unifiedAsset,
            free: coin.availableToWithdraw,
            used: coin.locked,
            total: coin.walletBalance,
          };
        });

        return acc;
      },
      {} as BalancesResponse['data'],
    );

    return {
      info: result,
      timestamp: time,
      data: balances,
      datetime: new Date(time).toISOString(),
    };
  }

  protected async _fetchRateLimits(): Promise<never[]> {
    return [];
  }
}
