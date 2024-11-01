/* eslint-disable new-cap */
import { Exchange } from 'ccxt';
import { ExchangeClientModule, ExchangeProviderModule, HttpClientModule, LoggerModule } from '@modules';
import {
  BalancesResponse,
  CurrenciesResponse,
  DepositWithdrawalFeesResponse,
  MarketsResponse,
  OrderBookResponse,
} from './types';

export type RequestsDetails<T> = {
  fetchMarkets: RequestDetails<T>[];
  fetchOrderBook: RequestDetails<T>[];
  fetchDepositWithdrawFees: RequestDetails<T>[];
  fetchCurrencies: RequestDetails<T>[];
  fetchBalances: RequestDetails<T>[];
  fetchRateLimits?: RequestDetails<T>[];
};

export abstract class BaseApiClient<Credentials, RequiredProps, RateLimits = any>
  implements ExchangeClientModule<RequiredProps>
{
  protected abstract httpClient: HttpClientModule;
  protected abstract ccxtClient?: Exchange;
  protected abstract ccxtConstructor: Constructor<Exchange>;
  protected abstract provider: ExchangeProviderModule<Credentials, RequestsDetails<RequiredProps>>;
  protected abstract logger: LoggerModule;

  protected details?: RequestsDetails<RequiredProps>;
  protected credentials?: Credentials;
  protected options?: any;

  public fetchCurrencies: FunctionWithDetails<typeof this._fetchCurrencies, RequiredProps>;
  public fetchMarkets: FunctionWithDetails<typeof this._fetchMarkets, RequiredProps>;
  public fetchBalances: FunctionWithDetails<typeof this._fetchBalances, RequiredProps>;
  public fetchOrderBook: FunctionWithDetails<typeof this._fetchOrderBook, RequiredProps>;
  public fetchDepositWithdrawFees: FunctionWithDetails<typeof this._fetchDepositWithdrawFees, RequiredProps>;
  public fetchRateLimits: FunctionWithDetails<typeof this._fetchRateLimits, RequiredProps>;

  constructor() {
    this.fetchCurrencies = this.withDetails(this._fetchCurrencies, this.details?.fetchCurrencies);
    this.fetchMarkets = this.withDetails(this._fetchMarkets, this.details?.fetchMarkets);
    this.fetchBalances = this.withDetails(this._fetchBalances, this.details?.fetchBalances);
    this.fetchOrderBook = this.withDetails(this._fetchOrderBook, this.details?.fetchOrderBook);
    this.fetchDepositWithdrawFees = this.withDetails(
      this._fetchDepositWithdrawFees,
      this.details?.fetchDepositWithdrawFees,
    );
    this.fetchRateLimits = this.withDetails(this._fetchRateLimits, this.details?.fetchRateLimits);
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing API Client...');

    this.details = await this.provider.getRequestDetails();
    this.credentials = await this.provider.getCredentials();

    this.logger.info('Fetched information from the provider');

    this.ccxtClient = new this.ccxtConstructor({ ...this.credentials, ...this.options });

    this.logger.info(
      `Created CCXT instance: ${!!this.ccxtClient}, required credentials provided: ${this.ccxtClient.checkRequiredCredentials(true)}`,
    );

    this.fetchCurrencies = this.withDetails(this._fetchCurrencies, this.details.fetchCurrencies);
    this.fetchMarkets = this.withDetails(this._fetchMarkets, this.details.fetchMarkets);
    this.fetchBalances = this.withDetails(this._fetchBalances, this.details?.fetchBalances);
    this.fetchOrderBook = this.withDetails(this._fetchOrderBook, this.details.fetchOrderBook);
    this.fetchDepositWithdrawFees = this.withDetails(
      this._fetchDepositWithdrawFees,
      this.details.fetchDepositWithdrawFees,
    );
    this.fetchRateLimits = this.withDetails(this._fetchRateLimits, this.details.fetchRateLimits);

    this.logger.info(`Changed method signatures`);
  }

  protected async _fetchCurrencies(): Promise<CurrenciesResponse> {
    if (this.ccxtClient?.has.fetchCurrencies) {
      const currencies = await this.ccxtClient.fetchCurrencies();
      return currencies as CurrenciesResponse;
    }
    throw new Error('Method ccxtClient.fetchCurrencies is not implemented for this exchange');
  }

  protected async _fetchMarkets(): Promise<MarketsResponse> {
    if (this.ccxtClient?.has.fetchMarkets) {
      const markets = await this.ccxtClient.fetchMarkets();
      return markets as MarketsResponse;
    }
    throw new Error('Method ccxtClient.fetchMarkets is not implemented for this exchange');
  }

  protected async _fetchOrderBook(symbol: string, limit?: number): Promise<OrderBookResponse> {
    if (this.ccxtClient?.has.fetchOrderBook) {
      const orderBook = await this.ccxtClient.fetchOrderBook(symbol, limit);
      return orderBook as OrderBookResponse;
    }
    throw new Error('Method ccxtClient.fetchOrderBook is not implemented for this exchange');
  }

  protected async _fetchDepositWithdrawFees(): Promise<DepositWithdrawalFeesResponse> {
    if (this.ccxtClient?.has.fetchDepositWithdrawFees) {
      const depositWithdrawFees = await this.ccxtClient.fetchDepositWithdrawFees();
      return depositWithdrawFees as DepositWithdrawalFeesResponse;
    }
    throw new Error('Method ccxtClient.fetchDepositWithdrawFees is not implemented for this exchange');
  }

  protected abstract _fetchBalances(): Promise<BalancesResponse>;

  protected abstract _fetchRateLimits(): Promise<RateLimits>;

  protected withDetails<Fn extends (...args: any) => any>(fn: Fn, details?: RequestDetails<RequiredProps>[]) {
    const wrappedFunction: {
      (...args: Parameters<Fn>): ReturnType<Fn>;
      details?: RequestDetails<RequiredProps>[];
    } = fn.bind(this);
    wrappedFunction.details = details || [];
    return wrappedFunction as {
      (...args: Parameters<Fn>): ReturnType<Fn>;
      details: RequestDetails<RequiredProps>[];
    };
  }

  assetInnerToUnified(assetInner: string): string {
    if (!this.ccxtClient) throw new Error('Client not initialized');
    return this.ccxtClient.safeCurrencyCode(assetInner);
  }

  assetUnifiedToInner(assetUnified: string): string {
    if (!this.ccxtClient) throw new Error('Client not initialized');
    return this.ccxtClient.currency(assetUnified);
  }

  networkInnerToUnified(networkInner: string, assetUnified?: string): string {
    if (!this.ccxtClient) throw new Error('Client not initialized');
    return this.ccxtClient.networkIdToCode(networkInner, assetUnified);
  }

  networkUnifiedToInner(networkUnified: string, assetUnified?: string): string {
    if (!this.ccxtClient) throw new Error('Client not initialized');
    return this.ccxtClient.networkCodeToId(networkUnified, assetUnified);
  }
}
