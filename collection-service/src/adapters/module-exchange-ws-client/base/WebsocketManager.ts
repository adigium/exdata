import { Emitter } from 'strict-event-emitter';
import { v4 as uuid } from 'uuid';
import { CloseEvent, ErrorEvent, Event, MessageEvent } from 'ws';
import { WebsocketBuilder, Websocket as WebsocketClass, WebsocketSides } from '@frameworks/websocket';
import { Websocket } from '../types';
import { WebsocketRateLimiter } from './WebsocketRateLimiter';
import { WebsocketSpecification } from './WebsocketSpecification';
import { WebsocketAuthentication } from './auth';

enum DefaultEvent {
  WebsocketClosed = 'websocket-closed',
  WebsocketError = 'websocket-error',
  WebsocketExpired = 'websocket-expired',
  WebsocketMessage = 'websocket-message',
  WebsocketOpened = 'websocket-opened',
}
enum PingPongEvent {
  PingFailed = 'ping-failed',
  PingReceived = 'ping-received',
  PingSent = 'ping-sent',
  PongReceived = 'pong-received',
  PongSent = 'pong-sent',
}

type Callbacks<P extends Websocket.Exchange.Action, M extends Websocket.Exchange.Message> = {
  onOpen?: (
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    event: Event,
  ) => Promise<void>;
  onClose?: (
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    event: CloseEvent,
  ) => Promise<void>;
  onMessage?: (
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    event: M[keyof M],
  ) => Promise<void>;
  onError?: (
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    error: ErrorEvent,
  ) => Promise<void>;
};

type Events<P extends Websocket.Exchange.Action, M extends Websocket.Exchange.Message> = {
  [DefaultEvent.WebsocketClosed]: Parameters<Required<Callbacks<P, M>>['onClose']>;
  [DefaultEvent.WebsocketError]: Parameters<Required<Callbacks<P, M>>['onError']>;
  [DefaultEvent.WebsocketMessage]: Parameters<Required<Callbacks<P, M>>['onMessage']>;
  [DefaultEvent.WebsocketOpened]: Parameters<Required<Callbacks<P, M>>['onOpen']>;
  [DefaultEvent.WebsocketExpired]: [websocketId: string];
  [PingPongEvent.PingSent]: [
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    payload?: P[Websocket.Action.PING],
  ];
  [PingPongEvent.PingReceived]: [
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
  ];
  [PingPongEvent.PingFailed]: [
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    error: any,
  ];
  [PingPongEvent.PongSent]: [
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
    payload?: P[Websocket.Action.PONG],
  ];
  [PingPongEvent.PongReceived]: [
    websocket: Websocket.Connection<P[Websocket.Action.PING], P[Websocket.Action.PONG]>,
  ];
};

type WebsocketManagerConstructor<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> = {
  authentication: WebsocketAuthentication<TPayloads, TMessages, TInnerTopic, TChannel>;
  specification: WebsocketSpecification<TPayloads, TMessages, TInnerTopic, TChannel>;
  rateLimiter: WebsocketRateLimiter;

  timeout?: number | undefined;
  lifetime?: number | undefined;
  websocketsLimit?: number | undefined;

  isPingingFrames?: boolean;
  pingInitiator?: WebsocketSides;
  pingInterval?: number;
};

export class WebsocketManager<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> extends Emitter<Events<TPayloads, TMessages>> {
  private websockets: Map<string, Websocket.Connection>;

  private authentication: WebsocketAuthentication<TPayloads, TMessages, TInnerTopic, TChannel>;
  private specification: WebsocketSpecification<TPayloads, TMessages, TInnerTopic, TChannel>;
  private rateLimiter: WebsocketRateLimiter;

  private timeout: number;
  private lifetime: number | undefined;
  private websocketsLimit: number | undefined;

  private isPingingFrames: boolean;
  private pingInitiator?: WebsocketSides;
  private pingInterval?: number;

  static readonly WEBSOCKET_CLOSED: DefaultEvent.WebsocketClosed = DefaultEvent.WebsocketClosed;
  static readonly WEBSOCKET_ERROR: DefaultEvent.WebsocketError = DefaultEvent.WebsocketError;
  static readonly WEBSOCKET_MESSAGE: DefaultEvent.WebsocketMessage = DefaultEvent.WebsocketMessage;
  static readonly WEBSOCKET_OPENED: DefaultEvent.WebsocketOpened = DefaultEvent.WebsocketOpened;
  static readonly WEBSOCKET_EXPIRED: DefaultEvent.WebsocketExpired = DefaultEvent.WebsocketExpired;

  static readonly PING_SENT: PingPongEvent.PingSent = PingPongEvent.PingSent;
  static readonly PING_RECEIVED: PingPongEvent.PingReceived = PingPongEvent.PingReceived;
  static readonly PING_FAILED: PingPongEvent.PingFailed = PingPongEvent.PingFailed;
  static readonly PONG_SENT: PingPongEvent.PongSent = PingPongEvent.PongSent;
  static readonly PONG_RECEIVED: PingPongEvent.PongReceived = PingPongEvent.PongReceived;

  constructor(input: WebsocketManagerConstructor<TPayloads, TMessages, TInnerTopic, TChannel>) {
    super();

    this.authentication = input.authentication;
    this.specification = input.specification;
    this.rateLimiter = input.rateLimiter;

    this.websockets = new Map<string, Websocket.Connection>();

    this.lifetime = input.lifetime;
    this.websocketsLimit = input.websocketsLimit;
    this.timeout = input.timeout || Websocket.Constants.DEFAULT_TIMEOUT;

    this.isPingingFrames = !!input.isPingingFrames;
    this.pingInitiator = input.pingInitiator;
    this.pingInterval = input.pingInterval;
  }

  /******************************************************************************************
   *  Public Methods: Connections Management
   ******************************************************************************************/

  public getConnections(): Map<string, Websocket.Connection> {
    return this.websockets;
  }

  public getConnection(id: string): Websocket.Connection | null {
    const websocket = this.websockets.get(id);

    if (!websocket || !websocket.websocket.isOpen()) return null;

    return websocket;
  }

  public clearConnection(id: string) {
    const websocket = this.websockets.get(id);

    if (websocket && !websocket.websocket.isClosed()) {
      websocket.websocket.close();
    }

    this.websockets.delete(id);
  }

  public async createConnection(
    channel: TChannel,
    id?: string,
    handlers?: Callbacks<TPayloads, TMessages>,
  ): Promise<Websocket.Connection> {
    if (this.websocketsLimit && this.websocketsLimit === Array.from(this.websockets.keys()).length)
      throw new Error('Websocket limit was reached, cannot create any more usable connections');

    const websocketId = id || uuid();

    let websocketUrl = await this.specification.getWebsocketUrl(channel, websocketId);
    const websocketOptions = await this.specification.getWebsocketOptions?.(channel, websocketId);

    if (this.specification.channelAuthentication[channel] === Websocket.Auth.CONNECTION_STRING) {
      const authenticator = this.authentication[Websocket.Auth.CONNECTION_STRING];
      if (!authenticator) {
        throw new Error(`No connection string authenticator provided, requested by ${channel} channel`);
      }

      websocketUrl = await authenticator.authenticate(websocketId, channel, websocketUrl);
    }

    await this.rateLimiter.ensureConnectionLimit();

    const websocket = new WebsocketBuilder<
      TPayloads[Websocket.Action.PING],
      TPayloads[Websocket.Action.PONG]
    >()
      .setId(websocketId)
      .setUrl(websocketUrl)
      .setTimeout(this.timeout)
      .setLifetime(this.lifetime, (websocket) => this.emit(WebsocketManager.WEBSOCKET_EXPIRED, websocket.id))
      .setPingOptions({
        isPingingFrames: this.isPingingFrames,
        pingInitiator: this.pingInitiator,
        pingInterval: this.pingInterval,
        getPingPayload: this.specification.getPingPayload?.bind(this.specification),
        getPongPayload: this.specification.getPongPayload?.bind(this.specification),
        isPingMessage: this.specification.isPingMessage?.bind(this.specification),
        isPongMessage: this.specification.isPongMessage?.bind(this.specification),
      })
      .waitBeforeSend(async (websocket) => {
        await this.rateLimiter.ensureSendLimit(websocket.id);
      })
      .build(websocketOptions);

    const websocketConnection: Websocket.Connection = {
      id: websocketId,
      websocket,
      channel,
      streamCount: 0,
      isAuthenticated: false,
    };

    if (this.specification.channelAuthentication[channel] === Websocket.Auth.CONNECTION_STRING) {
      const authenticator = this.authentication[Websocket.Auth.CONNECTION_STRING];
      if (!authenticator) {
        throw new Error(`No connection string authenticator provided, requested by ${channel} channel`);
      }

      const handleOpen = authenticator.handleConnectionOpened;
      if (handleOpen) websocket.addListener(WebsocketClass.OPEN, handleOpen);
      const handleClose = authenticator.handleConnectionClosed;
      if (handleClose) websocket.addListener(WebsocketClass.CLOSE, handleClose);
    }

    if (this.specification.getWebsocketOpenCallback) {
      const callback = this.specification.getWebsocketOpenCallback(channel, websocket);
      websocket.addListener(WebsocketClass.OPEN, callback);
    }
    if (this.specification.getWebsocketCloseCallback) {
      const callback = this.specification.getWebsocketCloseCallback(channel, websocket);
      websocket.addListener(WebsocketClass.CLOSE, callback);
    }

    this.websockets.set(websocketConnection.id, websocketConnection);

    this.setListeners(websocket, { websocketId, ...handlers });

    const connected = await Promise.race([
      new Promise<boolean>((resolve) => {
        websocket.once(WebsocketClass.OPEN, () => resolve(true));
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), this.timeout);
      }),
    ]);

    if (!connected) {
      websocket.close();

      throw new Error('Websocket connection opening timeout!');
    }

    if (this.specification.channelAuthentication[channel] === Websocket.Auth.NONE) {
      websocketConnection.isAuthenticated = true;
    }
    if (this.specification.channelAuthentication[channel] === Websocket.Auth.CONNECTION_STRING) {
      websocketConnection.isAuthenticated = true;
    }
    if (this.specification.channelAuthentication[channel] === Websocket.Auth.ONE_MESSAGE) {
      const authenticator = this.authentication[Websocket.Auth.ONE_MESSAGE];
      if (!authenticator) {
        throw new Error(`No one message authenticator provided, requested by ${channel} channel`);
      }

      websocketConnection.isAuthenticated = await authenticator.authenticate(websocket);
    }

    if (!websocketConnection.isAuthenticated) {
      websocket.close();
      throw new Error(`Websocket connection failed authentication for ${channel} channel`);
    }

    return websocketConnection;
  }

  /******************************************************************************************
   *  Public Methods: Access Shortcuts
   ******************************************************************************************/

  public async sendMessage(props: { websocketId: string; message: any }) {
    const { message, websocketId } = props;

    const websocket = this.getConnection(websocketId);

    if (!websocket) return false;

    await websocket.websocket.send(message);

    return true;
  }

  /******************************************************************************************
   *  Internal Methods: Websocket Handlers
   ******************************************************************************************/

  private setListeners(
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
    props: {
      websocketId: string;
    } & Callbacks<TPayloads, TMessages>,
  ) {
    const { websocketId, onOpen, onClose, onMessage, onError } = props;

    websocket.on(WebsocketClass.OPEN, (_, event) =>
      this.handleWebsocketOpen({ websocketId, event, callback: onOpen }),
    );
    websocket.on(WebsocketClass.CLOSE, (_, event) =>
      this.handleWebsocketClose({ websocketId, event, callback: onClose }),
    );
    websocket.on(WebsocketClass.MESSAGE, (_, event) =>
      this.handleWebsocketMessage({ websocketId, event, callback: onMessage }),
    );
    websocket.on(WebsocketClass.ERROR, (_, event) =>
      this.handleWebsocketError({ websocketId, event, callback: onError }),
    );

    websocket.on(WebsocketClass.PING_FAILED, (websocket, error) => {
      const connection = this.websockets.get(websocket.id);
      if (!connection) return;
      this.emit(WebsocketManager.PING_FAILED, connection, error);
    });
    websocket.on(WebsocketClass.PING_RECEIVED, (websocket) => {
      const connection = this.websockets.get(websocket.id);
      if (!connection) return;
      this.emit(WebsocketManager.PING_RECEIVED, connection);
    });
    websocket.on(WebsocketClass.PING_SENT, (websocket, payload) => {
      const connection = this.websockets.get(websocket.id);
      if (!connection) return;
      this.emit(WebsocketManager.PING_SENT, connection, payload);
    });
    websocket.on(WebsocketClass.PONG_RECEIVED, (websocket) => {
      const connection = this.websockets.get(websocket.id);
      if (!connection) return;
      this.emit(WebsocketManager.PONG_RECEIVED, connection);
    });
    websocket.on(WebsocketClass.PONG_SENT, (websocket, payload) => {
      const connection = this.websockets.get(websocket.id);
      if (!connection) return;
      this.emit(WebsocketManager.PONG_SENT, connection, payload);
    });
  }

  // Websocket: onOpen Hanlder
  private async handleWebsocketOpen(props: {
    websocketId: string;
    event: Event;
    callback?: Callbacks<TPayloads, TMessages>['onOpen'];
  }) {
    const { websocketId, event, callback } = props;
    const connection = this.websockets.get(websocketId);

    if (!connection) {
      event.target.close();
      throw new Error('Websocket connection is missing in memory, but still received "opened" event');
    }

    if (callback) {
      callback(connection, event);
      return;
    }

    this.emit(WebsocketManager.WEBSOCKET_OPENED, connection, event);
  }

  // Websocket: onClose Hanlder
  private async handleWebsocketClose(props: {
    websocketId: string;
    event: CloseEvent;
    callback?: Callbacks<TPayloads, TMessages>['onClose'];
  }) {
    const { websocketId, event, callback } = props;
    const connection = this.websockets.get(websocketId);

    this.websockets.delete(websocketId);

    if (!connection) return;

    if (callback) {
      callback(connection, event);
      return;
    }

    this.emit(WebsocketManager.WEBSOCKET_CLOSED, connection, event);
  }

  // Websocket: onMessage Hanlder
  private async handleWebsocketMessage(props: {
    websocketId: string;
    event: MessageEvent;
    callback?: Callbacks<TPayloads, TMessages>['onMessage'];
  }) {
    const { websocketId, event, callback } = props;
    const connection = this.websockets.get(websocketId);

    if (!connection) {
      event.target.close();
      throw new Error('Websocket connection is missing in memory, but still received "message" event');
    }

    let data: any = event.data;

    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      } else if (data instanceof Buffer || data instanceof ArrayBuffer) {
        data = JSON.parse(new TextDecoder('utf-8').decode(data));
      } else {
        return;
      }
    } catch (e: any) {
      throw Error(`Failed to parse websocket message`);
    }

    if (callback) {
      callback(connection, data);
      return;
    }

    this.emit(WebsocketManager.WEBSOCKET_MESSAGE, connection, data);
  }

  // Websocket: onError Hanlder
  private async handleWebsocketError(props: {
    websocketId: string;
    event: ErrorEvent;
    callback?: Callbacks<TPayloads, TMessages>['onError'];
  }) {
    const { websocketId, event, callback } = props;
    const connection = this.websockets.get(websocketId);

    if (!connection) return;

    if (callback) {
      callback(connection, event);
      return;
    }

    this.emit(WebsocketManager.WEBSOCKET_ERROR, connection, event);
  }
}
