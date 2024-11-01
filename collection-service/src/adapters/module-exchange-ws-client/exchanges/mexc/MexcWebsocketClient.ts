import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { MexcApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { MexcWebsocketSpecification } from './MexcWebsocketSpecification';
import { MexcConnectionStringStrategy } from './auth';
import { Mexc } from './definitions';

@injectable()
export class MexcWebsocketClient extends WebsocketClient<
  Mexc.Websocket.Payloads,
  Mexc.Websocket.Messages,
  Mexc.Websocket.Topic,
  Mexc.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Mexc;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Mexc)
  public exchangeClient!: MexcApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Mexc)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Mexc.Websocket.Payloads,
    Mexc.Websocket.Messages,
    Mexc.Websocket.Topic,
    Mexc.Websocket.Channel
  > {
    return new MexcWebsocketSpecification(this.configuration);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Mexc.Websocket.Payloads,
    Mexc.Websocket.Messages,
    Mexc.Websocket.Topic,
    Mexc.Websocket.Channel
  > {
    return {
      [Websocket.Auth.CONNECTION_STRING]: new MexcConnectionStringStrategy(
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
        lifetime: Mexc.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Mexc.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Mexc.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Mexc.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Mexc.Constant.WEBSOCKET_STREAM_LIMIT,
        websocketsLimit: Mexc.Constant.WEBSOCKET_CONNECTIONS_LIMIT,
        timeout: Mexc.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'MexcWebsocket');
  }
}
