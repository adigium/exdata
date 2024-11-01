import { inject, injectable, named } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { ExchangeMapperModule, LoggerModule, RateLimiterModule } from '@modules';
import { BybitApiClient } from '@adapters/module-exchange-client';
import { lazy } from '@frameworks/lazy-property';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { WebsocketAuthentication, WebsocketClient, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { BybitWebsocketSpecification } from './BybitWebsocketSpecification';
import { BybitOneMessageStrategy } from './auth';
import { Bybit } from './definitions';

@injectable()
export class BybitWebsocketClient extends WebsocketClient<
  Bybit.Websocket.Payloads,
  Bybit.Websocket.Messages,
  Bybit.Websocket.Topic,
  Bybit.Websocket.Channel
> {
  public exchangeId: ExchangeID = ExchangeID.Bybit;

  @inject(DI.ConfigurationService)
  protected configuration!: ConfigurationService;

  @inject(DI.SettingsRepository)
  protected settings!: SettingsRepository;

  @inject(DI.DatabaseRepository)
  protected database!: DatabaseRepository;

  @inject(DI.RateLimiterModule)
  public rateLimiter!: RateLimiterModule;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Bybit)
  public exchangeClient!: BybitApiClient<any>;

  @inject(DI.ExchangeMapperModule)
  @named(ExchangeID.Bybit)
  public mapper!: ExchangeMapperModule;

  public logger: LoggerModule;

  @lazy()
  public get specification(): WebsocketSpecification<
    Bybit.Websocket.Payloads,
    Bybit.Websocket.Messages,
    Bybit.Websocket.Topic,
    Bybit.Websocket.Channel
  > {
    return new BybitWebsocketSpecification(this.configuration);
  }

  @lazy()
  public get authentication(): WebsocketAuthentication<
    Bybit.Websocket.Payloads,
    Bybit.Websocket.Messages,
    Bybit.Websocket.Topic,
    Bybit.Websocket.Channel
  > {
    return {
      [Websocket.Auth.ONE_MESSAGE]: new BybitOneMessageStrategy(
        this.websocket,
        this.exchange,
        this.application,
      ),
    };
  }

  constructor() {
    super({
      options: {
        lifetime: Bybit.Constant.WEBSOCKET_LIFETIME_MS,
        isPingingFrames: Bybit.Constant.IS_WEBSOCKET_PINGING_FRAMES,
        pingInitiator: Bybit.Constant.WEBSOCKET_PINGING_SIDE,
        pingInterval: Bybit.Constant.WEBSOCKET_PINGING_INTERVAL_MS,
        streamsLimit: Bybit.Constant.WEBSOCKET_STREAM_LIMIT,
        timeout: Bybit.Constant.WEBSOCKET_TIMEOUT_MS,
      },
    });

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BybitWebsocket');
  }
}
