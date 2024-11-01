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
import { BaseExchangeService } from './base';

@injectable()
export class BybitService extends BaseExchangeService<ExchangeRequestContext.Bybit> {
  exchangeId: ExchangeID = ExchangeID.Bybit;

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
  @named(ExchangeID.Bybit)
  protected exchangeClient!: ExchangeClientModule<ExchangeRequestContext.Bybit>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Bybit)
  protected exchangeMapper!: ExchangeMapperModule;

  @inject(DI.ExchangeWebsocketModule)
  @named(ExchangeID.Bybit)
  protected websocketClient!: ExchangeWebsocketModule;

  constructor() {
    super();
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BybitService');
  }

  async initialize(): Promise<any> {
    this.logger.info(`Initializing the service`);
    this.logger.info(`Initialization finished!`);
  }
}