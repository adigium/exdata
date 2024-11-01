import dayjs from 'dayjs';
import { CloseEvent, ErrorEvent, Event } from 'ws';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import {
  ExchangeClientModule,
  ExchangeMapperModule,
  ExchangeWebsocketModule,
  LoggerModule,
  RateLimiterModule,
} from '@modules';
import { PipeIn, Pipeline, PipelineBuilder, PipeOut } from '@frameworks/pipeline';
import { ConfigurationService } from '@services/core';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../interfaces';
import { Websocket } from '../types';
import { WebsocketManager } from './WebsocketManager';
import { WebsocketRateLimiter } from './WebsocketRateLimiter';
import { WebsocketRequestManager } from './WebsocketRequestManager';
import { WebsocketSpecification } from './WebsocketSpecification';
import { WebsocketStreamManager } from './WebsocketStreamManager';
import { WebsocketAuthentication } from './auth';
import { DepthFullHandler, DepthLightHandler, TopicHandler } from './handlers';
import { BalanceUpdatesHandler } from './handlers/BalanceUpdatesHandler';
import {
  CommandMessageStep,
  CommandPayloadStep,
  CommandResultStep,
  CommandTrackStep,
  CommandWebsocketStep,
  MessageContextStep,
  MessageEventStep,
  MessageRequestStep,
} from './steps';

enum Status {
  CREATED = 'created',
  INITIALIZED = 'initialized',
  STARTED = 'started',
  STOPPED = 'stopped',
}
export abstract class WebsocketClient<
    TPayloads extends Websocket.Exchange.Action,
    TMessages extends Websocket.Exchange.Message,
    TInnerTopic extends string,
    TChannel extends string,
  >
  implements ExchangeWebsocketModule, WebsocketScoped
{
  public abstract exchangeId: ExchangeID;

  private status: Status = Status.CREATED;

  protected websocketManager!: WebsocketManager<TPayloads, TMessages, TInnerTopic, TChannel>;
  protected websocketRateLimiter!: WebsocketRateLimiter;
  protected websocketStreamManager!: WebsocketStreamManager<TPayloads, TMessages, TInnerTopic, TChannel>;
  protected websocketRequestManager!: WebsocketRequestManager;

  public abstract authentication: WebsocketAuthentication<TPayloads, TMessages, TInnerTopic, TChannel>;
  public abstract specification: WebsocketSpecification<TPayloads, TMessages, TInnerTopic, TChannel>;
  public abstract exchangeClient: ExchangeClientModule<any>;
  public abstract rateLimiter: RateLimiterModule;
  public abstract mapper: ExchangeMapperModule;
  public abstract logger: LoggerModule;
  protected abstract configuration: ConfigurationService;
  protected abstract settings: SettingsRepository;
  protected abstract database: DatabaseRepository;

  private messageHandler!: Pipeline<PipeIn<MessageContextStep>, PipeOut<MessageEventStep>>;
  private commandHandler!: Pipeline<PipeIn<CommandWebsocketStep>, PipeOut<CommandResultStep>>;
  private eventHandlers!: Record<Websocket.Topic, TopicHandler<any>>;

  constructor(private input: { options?: Websocket.CreateOptions }) {}

  public get application(): ApplicationScope {
    return {
      configuration: this.configuration,
      database: this.database,
      rateLimiter: this.rateLimiter,
      settings: this.settings,
    };
  }

  public get exchange(): ExchangeScope {
    return {
      clientApi: this.exchangeClient,
      clientWs: this,
      id: this.exchangeId,
      mapper: this.mapper,
    };
  }

  public get websocket(): WebsocketScope {
    return {
      connectionManager: this.websocketManager,
      logger: this.logger,
      rateLimiter: this.websocketRateLimiter,
      requestManager: this.websocketRequestManager,
      specification: this.specification,
      streamManager: this.websocketStreamManager,
    };
  }

  public initialize() {
    const { options } = this.input;

    this.websocketRequestManager = new WebsocketRequestManager();
    this.websocketRateLimiter = new WebsocketRateLimiter({
      exchangeId: this.exchangeId,
      rateLimiter: this.rateLimiter,
      ip: this.configuration.PUBLIC_IP,
      uid: this.specification.uid,
    });
    this.websocketManager = new WebsocketManager({
      ...options,
      rateLimiter: this.websocketRateLimiter,
      specification: this.specification,
      authentication: this.authentication,
    });
    this.websocketStreamManager = new WebsocketStreamManager({ websocketManager: this.websocketManager });

    const scopeDeps = [this.application, this.exchange, this.websocket] as const;

    this.commandHandler = new PipelineBuilder()
      .addStep(new CommandWebsocketStep(...scopeDeps, options?.streamsLimit))
      .addStep(new CommandPayloadStep(...scopeDeps, this.authentication))
      .addStep(new CommandTrackStep(...scopeDeps))
      .addStep(new CommandMessageStep(...scopeDeps))
      .addStep(new CommandResultStep(...scopeDeps))
      .build();
    this.messageHandler = new PipelineBuilder()
      .addStep(new MessageContextStep(...scopeDeps))
      .addStep(new MessageRequestStep(...scopeDeps))
      .addStep(new MessageEventStep(...scopeDeps))
      .build();

    this.eventHandlers = {
      [Websocket.Topic.BALANCE_UPDATES]: new BalanceUpdatesHandler(...scopeDeps),
      [Websocket.Topic.DEPTH_FULL]: new DepthFullHandler(...scopeDeps),
      [Websocket.Topic.DEPTH_LIGHT]: new DepthLightHandler(...scopeDeps),
    };

    this.websocketManager
      .on(WebsocketManager.PING_FAILED, this.onPingFailed.bind(this))
      .on(WebsocketManager.PING_RECEIVED, this.onPingReceived.bind(this))
      .on(WebsocketManager.PONG_RECEIVED, this.onPongReceived.bind(this))
      .on(WebsocketManager.PING_SENT, this.onPingSent.bind(this))
      .on(WebsocketManager.PONG_SENT, this.onPongSent.bind(this))
      .on(WebsocketManager.WEBSOCKET_CLOSED, this.onWebsocketClose.bind(this))
      .on(WebsocketManager.WEBSOCKET_ERROR, this.onWebsocketError.bind(this))
      .on(WebsocketManager.WEBSOCKET_MESSAGE, this.onWebsocketMessage.bind(this))
      .on(WebsocketManager.WEBSOCKET_OPENED, this.onWebsocketOpen.bind(this))
      .on(WebsocketManager.WEBSOCKET_EXPIRED, this.handleExpire.bind(this));

    this.status = Status.INITIALIZED;
  }

  public async open() {
    if (this.status === Status.CREATED) this.initialize();

    this.status = Status.STARTED;
  }

  public async close() {
    this.status = Status.STOPPED;

    this.logger.info('Closing websocket client...');

    this.websocketManager.getConnections().forEach((connection) => connection.websocket.close());
    this.websocketRequestManager = new WebsocketRequestManager();

    this.logger.info('Websocket client closed');
  }

  public getActiveStreams<T extends keyof Websocket.Streams.UTopicSubject>(
    topic: T,
  ): Websocket.Stream<any, T>[] {
    if (this.status === Status.CREATED) this.initialize();

    const activeStreams: Websocket.Stream<any, T>[] = [];

    for (const stream of this.websocketStreamManager.getStreams().values()) {
      if (!Websocket.Streams.isOfType(stream.stream, topic)) continue;

      if (
        stream.requests &&
        (stream.requests?.unsubscribeRequestedAt ||
          stream.requests?.unsubscribedAt ||
          !stream.requests?.subscribedAt)
      )
        continue;

      const ws = this.websocketManager.getConnection(stream.websocketId);
      if (!ws || !ws.websocket.isOpen()) continue;

      activeStreams.push(stream.stream);
    }

    return activeStreams;
  }

  /******************************************************************************************
   *  Requests
   ******************************************************************************************/

  public async subscribe(props: { topic: Websocket.Topic; symbols: string[] }) {
    if (this.status === Status.CREATED) this.initialize();
    if (this.status === Status.STOPPED) return;

    const topic = props.topic;

    const streams = props.symbols.reduce((acc, subject) => {
      const stream = this.mapToStream(topic, subject);
      const websocketStream = this.websocketStreamManager.getStream(stream.id);

      if (!websocketStream || !!websocketStream.requests?.unsubscribedAt) acc.push(stream);

      return acc;
    }, [] as Websocket.Stream[]);

    this.logger.debug(
      `Subscribing request for ${props.symbols.length}, and only ${streams.length} are not present`,
    );

    if (streams.length === 0) return;

    const { presubscriptionEvents } = await this.commandHandler.execute({
      action: Websocket.Action.SUBSCRIBE,
      streams,
    });

    // TODO: Handle failed subscriptions

    this.handleEvents(presubscriptionEvents);
  }

  public async unsubscribe(props: { topic: Websocket.Topic; symbols: string[] }) {
    if (this.status === Status.CREATED) this.initialize();
    if (this.status === Status.STOPPED) return;

    const topic = props.topic;

    const streams = props.symbols.reduce((acc, subject) => {
      const stream = this.mapToStream(topic, subject);
      const websocketStream = this.websocketStreamManager.getStream(stream.id);

      if (websocketStream && (!websocketStream.requests || !websocketStream.requests.unsubscribedAt)) {
        acc.push(stream);
      }

      return acc;
    }, [] as Websocket.Stream[]);

    if (streams.length === 0) return;

    const { presubscriptionEvents } = await this.commandHandler.execute({
      action: Websocket.Action.UNSUBSCRIBE,
      streams,
    });

    // TODO: Handle failed unsubscriptions

    this.handleEvents(presubscriptionEvents);
  }

  /******************************************************************************************
   *  Internal Methods: Websocket Initialization
   ******************************************************************************************/

  private async handleExpire(websocketId: string) {
    if (this.status === Status.STOPPED)
      throw new Error('Trying refresh a websocket connection while the stream manager is already closed');

    const connectionStreams = Array.from(
      this.websocketStreamManager.getStreams().values(),
    ) as Websocket.ConnectionStream[];

    if (!connectionStreams || connectionStreams.length === 0) return;

    const streams = connectionStreams
      .filter(
        (wsStream) =>
          wsStream.websocketId === websocketId &&
          (!wsStream.requests || !wsStream.requests.unsubscribeRequestedAt),
      )
      .map((websocketStream) => websocketStream.stream);

    this.websocketRequestManager.clearRequestsForWebsocket(websocketId);
    this.websocketStreamManager.clearStreams(websocketId);
    this.websocketManager.clearConnection(websocketId);

    const { presubscriptionEvents } = await this.commandHandler.execute({
      action: Websocket.Action.SUBSCRIBE,
      streams,
    });

    // TODO: Handle failed subscriptions

    this.handleEvents(presubscriptionEvents);
  }

  private handleEvents(events: Websocket.MessageEvent[]) {
    events.forEach((event) => {
      const handler = this.eventHandlers[event.topicUnified];
      if (event.event === Websocket.Event.SUBSCRIBE) {
        this.logger.debug(`Subscribed for topic: ${event.topicUnified}: ${event.data.subjects}`);
        handler.handleSubscribe(event.data.subjects);
      }
      if (event.event === Websocket.Event.UNSUBSCRIBE) handler.handleUnsubscribe(event.data.subjects);
      if (event.event === Websocket.Event.UPDATE) handler.handleUpdate(event.data.message);
    });
  }

  /******************************************************************************************
   *  Internal Methods: Helpers
   ******************************************************************************************/

  private mapToStream<TUnifiedTopic extends keyof Websocket.Streams.UTopicSubject>(
    ...args: Websocket.Streams.FunctionArgs<TUnifiedTopic>
  ): Websocket.Stream<Websocket.Map.UTopicITopic<TInnerTopic>, TUnifiedTopic> {
    const [topic, subject] = args;

    const innerTopic = this.getInnerTopic(topic);
    const identifier = this.websocketStreamManager.getStreamIdentifier(innerTopic, subject);

    const stream: Websocket.Stream<any, TUnifiedTopic> = {
      id: identifier,
      topic,
      innerTopic,
      innerSubject: subject as Websocket.Streams.UTopicSubject[TUnifiedTopic],
    };

    return stream;
  }

  private getInnerTopic(topicUnified: Websocket.Topic) {
    const topicMap = this.specification.topicMap;

    if (!topicMap[topicUnified]) throw new Error(`No mapping to topic for topic type ${topicUnified}`);

    return topicMap[topicUnified];
  }

  /******************************************************************************************
   *  Internal Methods: Websocket Handlers
   ******************************************************************************************/

  private onPingFailed(websocket: Websocket.Connection, error: Error) {
    this.logger.error(`Error sending ping message for ${websocket.id}: ${error.message}`);
  }

  private onPingReceived(websocket: Websocket.Connection) {
    this.logger.debug(`Received ping message for: ${websocket.id}`);
  }

  private onPongReceived(websocket: Websocket.Connection) {
    this.logger.debug(`Received pong message for: ${websocket.id}`);
  }

  private onPingSent(websocket: Websocket.Connection, payload: any) {
    if (payload) {
      this.websocketRequestManager.addRequest({
        id: websocket.id,
        websocketId: websocket.id,
        data: payload,
        type: Websocket.Action.PING,
      });
    }
    this.logger.debug(`Sent ping message for: ${websocket.id}`);
  }

  private onPongSent(websocket: Websocket.Connection, payload: any) {
    if (payload) {
      this.websocketRequestManager.addRequest({
        id: websocket.id,
        websocketId: websocket.id,
        data: payload,
        type: Websocket.Action.PONG,
      });
    }
    this.logger.debug(`Sent pong message for: ${websocket.id}`);
  }

  private async onWebsocketOpen(websocket: Websocket.Connection, event: Event) {
    this.logger.info(`Opened new websocket connection: ${event.target.url}`);
  }

  private async onWebsocketClose(websocket: Websocket.Connection, event: CloseEvent) {
    this.logger.warn(`Closed websocket connection: ${websocket.id}: ${event.code} - ${event.reason}`);
    this.logger.warn(
      `Closed connection stats: ${websocket.id}: last ping - ${websocket.websocket.lastPingAt || -1} (${dayjs().diff(websocket.websocket.lastPingAt)} gone); last pong - ${websocket.websocket.lastPongAt || -1} (${dayjs().diff(websocket.websocket.lastPongAt)} gone)`,
    );

    this.websocketRequestManager.clearRequestsForWebsocket(websocket.id);
    this.websocketStreamManager.clearStreams(websocket.id);
    this.websocketManager.clearConnection(websocket.id);
  }

  private async onWebsocketMessage(websocket: Websocket.Connection, data: TMessages[keyof TMessages]) {
    if (this.status === Status.STOPPED) {
      this.logger.error(`Received message when stream manager is stopped!`);
      return;
    }
    if (!this.websocketManager.getConnections().has(websocket.id)) {
      this.logger.error(`Received message for the deleted websocket`);
      return;
    }

    const { events } = await this.messageHandler.execute({ websocketId: websocket.id, message: data });

    this.handleEvents(events);
  }

  private async onWebsocketError(websocket: Websocket.Connection, event: ErrorEvent) {
    this.logger.error(`Error on websocket: ${websocket.id}: ${event.type} - ${event.message}`);
    this.logger.error(`Error on websocket (error): ${websocket.id}: ${JSON.stringify(event.error, null, 2)}`);
  }
}
