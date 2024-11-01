import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import {
  ExchangeClientModule,
  ExchangeMapperModule,
  ExchangeWebsocketModule,
  HttpClientModule,
  LoggerModule,
  RateLimiterModule,
} from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { RequestService } from '@services/utility';
import { BaseExchangeService } from './base';

@injectable()
export class BinanceService extends BaseExchangeService<ExchangeRequestContext.Binance> {
  exchangeId: ExchangeID = ExchangeID.Binance;

  logger: LoggerModule;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.HttpClientModule)
  protected httpClient!: HttpClientModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Binance)
  protected exchangeClient!: ExchangeClientModule<ExchangeRequestContext.Binance>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Binance)
  protected exchangeMapper!: ExchangeMapperModule;

  @inject(DI.ExchangeWebsocketModule)
  @named(ExchangeID.Binance)
  protected websocketClient!: ExchangeWebsocketModule;

  constructor() {
    super();
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BinanceService');
  }

  async initialize(): Promise<any> {
    this.logger.info(`Initializing the service`);

    this.logger.info(`Fetching the initial information`);

    const exchangeInfo = await RequestService.with(this).request(this.exchangeClient.fetchRateLimits);

    this.logger.info(`Rate limits fetching completed`);

    const rateLimits = exchangeInfo?.reduce(
      (acc, limit) => {
        const intervalKey = `${limit.intervalNum}${limit.interval.charAt(0)}`;
        switch (limit.rateLimitType) {
          case 'REQUEST_WEIGHT':
            if (!acc.api) acc.api = {};
            acc.api[intervalKey] = limit.limit;
            break;
          case 'ORDERS':
            if (!acc.orders) acc.orders = {};
            acc.orders[intervalKey] = limit.limit;
            break;
          case 'RAW_REQUESTS':
            if (!acc.requests) acc.requests = {};
            acc.requests[intervalKey] = limit.limit;
            break;
          default:
            break;
        }
        return acc;
      },
      {} as {
        api?: Record<string, number>;
        orders?: Record<string, number>;
        requests?: Record<string, number>;
      },
    );

    this.logger.info(
      `The updated rate limits are: ${Object.keys(rateLimits?.api || {}).length + Object.keys(rateLimits?.orders || {}).length + Object.keys(rateLimits?.requests || {}).length}`,
    );

    if (!rateLimits) return;

    if (rateLimits.api)
      this.rateLimiter.updateLimits(
        this.getId(),
        {
          endpoint: '/api/',
          weight: 0,
          id: this.configuration.BINANCE_UID,
          ip: this.configuration.PUBLIC_IP,
        },
        rateLimits.api,
      );
    if (rateLimits.orders)
      this.rateLimiter.updateLimits(
        this.getId(),
        {
          endpoint: '/api/',
          weight: 0,
          id: this.configuration.BINANCE_UID,
          ip: this.configuration.PUBLIC_IP,
        },
        rateLimits.orders,
      );
    if (rateLimits.requests)
      this.rateLimiter.updateLimits(
        this.getId(),
        {
          endpoint: '/api/',
          weight: 0,
          id: this.configuration.BINANCE_UID,
          ip: this.configuration.PUBLIC_IP,
        },
        rateLimits.requests,
      );

    this.logger.info(`Initialization finished!`);
  }
}
