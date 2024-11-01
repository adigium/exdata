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
export class MexcService extends BaseExchangeService<ExchangeRequestContext.Mexc> {
  exchangeId: ExchangeID = ExchangeID.Mexc;

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
  @named(ExchangeID.Mexc)
  protected exchangeClient!: ExchangeClientModule<ExchangeRequestContext.Mexc>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Mexc)
  protected exchangeMapper!: ExchangeMapperModule;

  @inject(DI.ExchangeWebsocketModule)
  @named(ExchangeID.Mexc)
  protected websocketClient!: ExchangeWebsocketModule;

  constructor() {
    super();
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'MexcService');
  }

  async initialize(): Promise<any> {
    this.logger.info(`Initializing the service`);
    this.logger.info(`Initialization finished!`);
  }
}
