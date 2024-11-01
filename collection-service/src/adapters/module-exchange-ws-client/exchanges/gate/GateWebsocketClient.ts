import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { GateApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { GateWebsocketSpecification } from './GateWebsocketSpecification';
import { GatePerMessageStrategy } from './auth';
import { Gate } from './definitions';

@injectable()
export class GateWebsocketClient extends WebsocketClient<
  Gate.Websocket.Payloads,
  Gate.Websocket.Messages,
  Gate.Websocket.Topic,
  Gate.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Gate;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Gate)
  public exchangeClient!: GateApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Gate)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Gate.Websocket.Payloads,
    Gate.Websocket.Messages,
    Gate.Websocket.Topic,
    Gate.Websocket.Channel
  > {
    return new GateWebsocketSpecification(this.configuration);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Gate.Websocket.Payloads,
    Gate.Websocket.Messages,
    Gate.Websocket.Topic,
    Gate.Websocket.Channel
  > {
    return {
      [Websocket.Auth.PER_MESSAGE]: new GatePerMessageStrategy(
        this.websocket,
        this.exchange,
        this.application,
      ),
    };
  }

  constructor() {
    super({
      options: {
        lifetime: Gate.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Gate.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Gate.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Gate.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Gate.Constant.WEBSOCKET_STREAM_LIMIT,
        websocketsLimit: Gate.Constant.WEBSOCKET_CONNECTIONS_LIMIT,
        timeout: Gate.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'GateWebsocket');
  }
}
