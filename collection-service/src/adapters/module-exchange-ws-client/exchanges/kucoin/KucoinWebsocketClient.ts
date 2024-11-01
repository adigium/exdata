import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { KucoinApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { KucoinWebsocketSpecification } from './KucoinWebsocketSpecification';
import { KucoinConnectionStringStrategy } from './auth';
import { Kucoin } from './definitions';

@injectable()
export class KucoinWebsocketClient extends WebsocketClient<
  Kucoin.Websocket.Payloads,
  Kucoin.Websocket.Messages,
  Kucoin.Websocket.Topic,
  Kucoin.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Kucoin;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Kucoin)
  public exchangeClient!: KucoinApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Kucoin)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Kucoin.Websocket.Payloads,
    Kucoin.Websocket.Messages,
    Kucoin.Websocket.Topic,
    Kucoin.Websocket.Channel
  > {
    return new KucoinWebsocketSpecification(this.configuration, this.rateLimiter, this.exchangeClient);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Kucoin.Websocket.Payloads,
    Kucoin.Websocket.Messages,
    Kucoin.Websocket.Topic,
    Kucoin.Websocket.Channel
  > {
    return {
      [Websocket.Auth.CONNECTION_STRING]: new KucoinConnectionStringStrategy(
        this.exchangeId,
        this.configuration,
        this.rateLimiter,
        this.exchangeClient,
      ),
    };
  }

  constructor() {
    super({
      options: {
        lifetime: Kucoin.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Kucoin.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Kucoin.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Kucoin.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Kucoin.Constant.WEBSOCKET_STREAM_LIMIT,
        websocketsLimit: Kucoin.Constant.WEBSOCKET_CONNECTIONS_LIMIT,
        timeout: Kucoin.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'KucoinWebsocket');
  }
}
