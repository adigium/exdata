import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { PoloniexApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { PoloniexWebsocketSpecification } from './PoloniexWebsocketSpecification';
import { PoloniexOneMessageStrategy } from './auth';
import { Poloniex } from './definitions';

@injectable()
export class PoloniexWebsocketClient extends WebsocketClient<
  Poloniex.Websocket.Payloads,
  Poloniex.Websocket.Messages,
  Poloniex.Websocket.Topic,
  Poloniex.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Poloniex;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Poloniex)
  public exchangeClient!: PoloniexApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Poloniex)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Poloniex.Websocket.Payloads,
    Poloniex.Websocket.Messages,
    Poloniex.Websocket.Topic,
    Poloniex.Websocket.Channel
  > {
    return new PoloniexWebsocketSpecification(this.configuration);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Poloniex.Websocket.Payloads,
    Poloniex.Websocket.Messages,
    Poloniex.Websocket.Topic,
    Poloniex.Websocket.Channel
  > {
    return {
      [Websocket.Auth.ONE_MESSAGE]: new PoloniexOneMessageStrategy(
        this.websocket,
        this.exchange,
        this.application,
      ),
    };
  }

  constructor() {
    super({
      options: {
        lifetime: Poloniex.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Poloniex.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Poloniex.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Poloniex.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Poloniex.Constant.WEBSOCKET_STREAM_LIMIT,
        websocketsLimit: Poloniex.Constant.WEBSOCKET_CONNECTIONS_LIMIT,
        timeout: Poloniex.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'PoloniexWebsocket');
  }
}
