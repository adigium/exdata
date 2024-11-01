import { ClientRequest, ClientRequestArgs, IncomingMessage } from 'http';
import { Emitter } from 'strict-event-emitter';
import { v4 as uuid } from 'uuid';
import { ClientOptions, CloseEvent, ErrorEvent, Event, MessageEvent, WebSocket } from 'ws';

export enum WebsocketSides {
  CLIENT = 'client',
  SERVER = 'server',
}

export type WebsocketConstructorOptions<Ping, Pong> = {
  id?: string;
  url: URL | string;
  protocols?: string | string[];

  timeout?: number;

  lifetime?: number;
  lifetimeCallback?: (websocket: Websocket<Ping, Pong>) => void;

  isPingingFrames: boolean;
  pingInitiator?: WebsocketSides;
  pingInterval?: number;
  getPingPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Ping>;
  getPongPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Pong>;
  isPingMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
  isPongMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;

  waitSend?: (websocket: Websocket<Ping, Pong>) => Promise<void>;
};

enum DefaultEvent {
  Close = 'close',
  Error = 'error',
  Message = 'message',
  Open = 'open',
  Ping = 'ping',
  Pong = 'pong',
  UnexpectedResponse = 'unexpected-response',
  Upgrade = 'upgrade',
}
enum PingPongEvent {
  PingFailed = 'ping-failed',
  PingReceived = 'ping-received',
  PingSent = 'ping-sent',
  PongReceived = 'pong-received',
  PongSent = 'pong-sent',
}

type Events<Ping, Pong> = {
  [DefaultEvent.Close]: [websocket: Websocket<Ping, Pong>, event: CloseEvent];
  [DefaultEvent.Error]: [websocket: Websocket<Ping, Pong>, error: ErrorEvent];
  [DefaultEvent.Upgrade]: [websocket: Websocket<Ping, Pong>, request: IncomingMessage];
  [DefaultEvent.Message]: [websocket: Websocket<Ping, Pong>, event: MessageEvent];
  [DefaultEvent.Open]: [websocket: Websocket<Ping, Pong>, event: Event];
  [DefaultEvent.Ping]: [websocket: Websocket<Ping, Pong>, data: Buffer];
  [DefaultEvent.Pong]: [websocket: Websocket<Ping, Pong>, data: Buffer];
  [DefaultEvent.UnexpectedResponse]: [
    websocket: Websocket<Ping, Pong>,
    request: ClientRequest,
    response: IncomingMessage,
  ];
  [PingPongEvent.PingSent]: [websocket: Websocket<Ping, Pong>, payload?: Ping];
  [PingPongEvent.PingReceived]: [websocket: Websocket<Ping, Pong>];
  [PingPongEvent.PingFailed]: [websocket: Websocket<Ping, Pong>, error: any];
  [PingPongEvent.PongSent]: [websocket: Websocket<Ping, Pong>, payload?: Pong];
  [PingPongEvent.PongReceived]: [websocket: Websocket<Ping, Pong>];
};

const DEFAULT_TIMEOUT = 60 * 1000;

export class Websocket<Ping, Pong> extends Emitter<Events<Ping, Pong>> {
  public id: string;

  private connection: WebSocket;
  private timeout: number;

  private lifetime?: number;
  private lifetimeCallback?: (websocket: Websocket<Ping, Pong>) => void;
  private lifetimeTimeout?: NodeJS.Timeout;

  private isPingingFrames: boolean;
  private pingInitiator?: WebsocketSides;
  private pingInterval?: number;
  private pingTask?: NodeJS.Timeout;
  private getPingPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Ping>;
  private getPongPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Pong>;
  private isPingMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
  private isPongMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;

  private waitSend?: (websocket: Websocket<Ping, Pong>) => Promise<void>;

  public createdAt: number;
  public openedAt?: number;
  public lastPingAt?: number;
  public lastPongAt?: number;

  static readonly CLOSE: DefaultEvent.Close = DefaultEvent.Close;
  static readonly ERROR: DefaultEvent.Error = DefaultEvent.Error;
  static readonly MESSAGE: DefaultEvent.Message = DefaultEvent.Message;
  static readonly OPEN: DefaultEvent.Open = DefaultEvent.Open;
  static readonly PING: DefaultEvent.Ping = DefaultEvent.Ping;
  static readonly PONG: DefaultEvent.Pong = DefaultEvent.Pong;
  static readonly UNEXPECTED_RESPONSE: DefaultEvent.UnexpectedResponse = DefaultEvent.UnexpectedResponse;
  static readonly UPGRADE: DefaultEvent.Upgrade = DefaultEvent.Upgrade;

  static readonly PING_SENT: PingPongEvent.PingSent = PingPongEvent.PingSent;
  static readonly PING_RECEIVED: PingPongEvent.PingReceived = PingPongEvent.PingReceived;
  static readonly PING_FAILED: PingPongEvent.PingFailed = PingPongEvent.PingFailed;
  static readonly PONG_SENT: PingPongEvent.PongSent = PingPongEvent.PongSent;
  static readonly PONG_RECEIVED: PingPongEvent.PongReceived = PingPongEvent.PongReceived;

  constructor(config: WebsocketConstructorOptions<Ping, Pong>, options?: ClientOptions | ClientRequestArgs) {
    super();

    this.createdAt = Date.now();

    this.id = config.id || uuid();
    this.timeout = config.timeout || DEFAULT_TIMEOUT;

    this.lifetime = config.lifetime;
    this.lifetimeCallback = config.lifetimeCallback;

    this.pingInitiator = config.pingInitiator;
    this.pingInterval = config.pingInterval;
    this.isPingingFrames = config.isPingingFrames;
    this.getPingPayload = config.getPingPayload;
    this.getPongPayload = config.getPongPayload;
    this.isPingMessage = config.isPingMessage;
    this.isPongMessage = config.isPongMessage;
    this.waitSend = config.waitSend;

    this.connection = new WebSocket(config.url, config.protocols, options);

    Promise.race([
      new Promise<boolean>((resolve) => {
        this.connection.once('open', () => {
          this.emit(DefaultEvent.Open, this, { target: this.connection, type: 'open' });
          resolve(true);
        });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), this.timeout);
      }),
    ]).then(this.handleOpen.bind(this));
  }

  public isOpen = () => this.connection.readyState === this.connection.OPEN;
  public isClosed = () => this.connection.readyState === this.connection.CLOSED;
  public isPaused = () => this.connection.isPaused;

  public async send(data: any) {
    const stringMessage = JSON.stringify(data);

    if (!this.isValidUTF8(stringMessage)) throw new Error(`Trying to send invalid UTF-8 string`);

    if (this.waitSend) await this.waitSend(this);

    this.connection.send(stringMessage);
  }

  public async close() {
    this.connection.close();
  }

  public async terminate() {
    this.connection.terminate();
  }

  /******************************************************************************************
   *  Internal Methods: Main Handlers
   ******************************************************************************************/

  private handleOpen(isOpen: boolean) {
    if (!isOpen) {
      this.connection.close();
      return;
    }

    this.openedAt = Date.now();

    this.connection.addEventListener('close', (...args) => this.emit(DefaultEvent.Close, this, ...args));
    this.connection.addEventListener('error', (...args) => this.emit(DefaultEvent.Error, this, ...args));
    this.connection.addEventListener('message', (...args) => this.emit(DefaultEvent.Message, this, ...args));
    this.connection.addEventListener('open', (...args) => this.emit(DefaultEvent.Open, this, ...args));
    this.connection.on('ping', (...args) => this.emit(DefaultEvent.Ping, this, ...args));
    this.connection.on('pong', (...args) => this.emit(DefaultEvent.Pong, this, ...args));
    this.connection.on('unexpected-response', (...args) =>
      this.emit(DefaultEvent.UnexpectedResponse, this, ...args),
    );
    this.connection.on('upgrade', (...args) => this.emit(DefaultEvent.Upgrade, this, ...args));

    this.handleLifetime();
    this.handlePingPong();
    this.handleClose();
  }

  private async handleLifetime() {
    if (this.lifetime) {
      const timeout = setTimeout(() => this.lifetimeTimeout && this.lifetimeCallback?.(this), this.lifetime);

      this.lifetimeTimeout = timeout;
    }
  }

  private async handlePingPong() {
    if (!this.isPingingFrames)
      this.connection.addEventListener('message', (event) => {
        let data = event.data;

        if (this.isPingingFrames) return;

        if (!this.isPingMessage || !this.isPongMessage)
          throw new Error(
            'Websocket was specified as non-frame pinging, but no message-check function was provided',
          );

        try {
          if (typeof data === 'string') data = JSON.parse(data);
          else if (data instanceof Buffer || data instanceof ArrayBuffer)
            data = JSON.parse(new TextDecoder('utf-8').decode(data));
          else return;
        } catch (e: any) {
          throw Error(`Failed to parse websocket message`);
        }

        if (this.isPingMessage(this, data)) {
          this.lastPingAt = Date.now();
          this.sendPongMessage();
        }
        if (this.isPongMessage(this, data)) {
          this.lastPongAt = Date.now();
        }
      });

    if (this.pingInitiator === WebsocketSides.CLIENT) {
      if (this.isPingingFrames)
        this.connection.on('pong', async () => {
          if (this.connection.readyState !== this.connection.OPEN) return;
          this.emit(Websocket.PONG_RECEIVED, this);
          this.lastPongAt = Date.now();
        });
      else await this.startPinging();
    }

    if (this.pingInitiator === WebsocketSides.SERVER) {
      if (this.isPingingFrames)
        this.connection.on('ping', async (data) => {
          if (this.connection.readyState !== this.connection.OPEN) return;
          this.emit(Websocket.PING_RECEIVED, this);
          this.lastPingAt = Date.now();

          await this.sendPongMessage(data);
        });
    }
  }

  private async handleClose() {
    this.connection.addEventListener('close', () => {
      if (this.pingInitiator === WebsocketSides.CLIENT) {
        this.stopPinging();
      }

      clearTimeout(this.lifetimeTimeout);
      this.lifetimeTimeout = undefined;
    });
  }

  /******************************************************************************************
   *  Internal Methods: Pinging Process
   ******************************************************************************************/

  public async sendPingMessage(data?: any) {
    if (this.isPingingFrames) {
      if (this.waitSend) await this.waitSend(this);

      this.connection.ping(data);
      this.emit(Websocket.PING_SENT, this);
    }

    if (!this.isPingingFrames && this.getPingPayload) {
      const pingMessage = await this.getPingPayload(this);

      await this.send(pingMessage);
      this.emit(Websocket.PING_SENT, this, pingMessage);
    }

    if (!this.isPingingFrames && !this.getPingPayload)
      throw new Error('Websocket specified as non-frame pinging, but no payload function was provided');

    this.lastPingAt = Date.now();
  }

  public async sendPongMessage(data?: any) {
    if (this.isPingingFrames) {
      if (this.waitSend) await this.waitSend(this);

      this.connection.pong(data);
      this.emit(Websocket.PONG_SENT, this);
    }

    if (!this.isPingingFrames && this.getPongPayload) {
      const pongMessage = await this.getPongPayload(this);

      await this.send(pongMessage);
      this.emit(Websocket.PONG_SENT, this, pongMessage);
    }

    if (!this.isPingingFrames && !this.getPongPayload)
      throw new Error('Websocket specified as non-frame pinging, but no payload function was provided');

    this.lastPongAt = Date.now();
  }

  // TODO: Fix and ensure pinging
  // TODO: Add retry mechanism if any error occured or compeletely stop the connection
  private async startPinging() {
    if (!this.pingInterval) throw new Error('No ping interval specified');

    const run = (async () => {
      try {
        if (!this.pingInterval) throw new Error('No ping interval specified');

        this.sendPingMessage();

        if (!this.pingTask || this.connection.readyState !== this.connection.OPEN) return;

        this.pingTask = setTimeout(run, this.pingInterval);
      } catch (error: any) {
        this.emit(Websocket.PING_FAILED, this, error);
      }
    }).bind(this);

    this.pingTask = setTimeout(run, this.pingInterval);
  }

  private stopPinging() {
    clearInterval(this.pingTask);
    this.pingTask = undefined;
  }

  /******************************************************************************************
   *  Internal Methods: Utility
   ******************************************************************************************/

  private isValidUTF8(message: string) {
    try {
      new TextDecoder().decode(new TextEncoder().encode(message));
      return true;
    } catch (e) {
      return false;
    }
  }
}
