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
export class PoloniexService extends BaseExchangeService<ExchangeRequestContext.Poloniex> {
  exchangeId: ExchangeID = ExchangeID.Poloniex;

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
  @named(ExchangeID.Poloniex)
  protected exchangeClient!: ExchangeClientModule<ExchangeRequestContext.Poloniex>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Poloniex)
  protected exchangeMapper!: ExchangeMapperModule;

  @inject(DI.ExchangeWebsocketModule)
  @named(ExchangeID.Poloniex)
  protected websocketClient!: ExchangeWebsocketModule;

  constructor() {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'PoloniexService');
  }

  async initialize(): Promise<any> {
    this.logger.info(`Initialization finished!`);
  }
}
