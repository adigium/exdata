import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { BinanceApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { BinanceWebsocketSpecification } from './BinanceWebsocketSpecification';
import { BinanceConnectionStringStrategy } from './auth';
import { Binance } from './definitions';

@injectable()
export class BinanceWebsocketClient extends WebsocketClient<
  Binance.Websocket.Payloads,
  Binance.Websocket.Messages,
  Binance.Websocket.Topic,
  Binance.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Binance;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Binance)
  public exchangeClient!: BinanceApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Binance)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Binance.Websocket.Payloads,
    Binance.Websocket.Messages,
    Binance.Websocket.Topic,
    Binance.Websocket.Channel
  > {
    return new BinanceWebsocketSpecification(this.configuration);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Binance.Websocket.Payloads,
    Binance.Websocket.Messages,
    Binance.Websocket.Topic,
    Binance.Websocket.Channel
  > {
    return {
      [Websocket.Auth.CONNECTION_STRING]: new BinanceConnectionStringStrategy(
        this.application,
        this.exchange,
        this.websocket,
        this.exchangeClient,
      ),
    };
  }

  constructor() {
    super({
      options: {
        lifetime: Binance.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Binance.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Binance.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Binance.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Binance.Constant.WEBSOCKET_STREAM_LIMIT,
        timeout: Binance.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BinanceWebsocket');
  }
}
