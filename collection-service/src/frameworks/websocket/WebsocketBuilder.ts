import { ClientRequestArgs } from 'http';
import { ClientOptions } from 'ws';
import { Websocket, WebsocketSides } from './Websocket';

export class WebsocketBuilder<Ping, Pong> {
  private id?: string;
  private url!: URL | string;
  private timeout = 60000;
  private lifetime?: number;
  private lifetimeCallback?: (websocket: Websocket<Ping, Pong>) => void;
  private isPingingFrames = false;
  private pingInitiator?: WebsocketSides;
  private pingInterval?: number;
  private getPingPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Ping>;
  private getPongPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Pong>;
  private isPingMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
  private isPongMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
  private waitSend?: (websocket: Websocket<Ping, Pong>) => Promise<void>;

  public setId(id: string): this {
    this.id = id;
    return this;
  }

  public setUrl(url: URL | string): this {
    this.url = url;
    return this;
  }

  public setTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  public setLifetime(lifetime?: number, callback?: (websocket: Websocket<Ping, Pong>) => void): this {
    this.lifetime = lifetime;
    this.lifetimeCallback = callback;
    return this;
  }

  public setPingOptions(input: {
    isPingingFrames: boolean;
    pingInitiator?: WebsocketSides;
    pingInterval?: number;
    getPingPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Ping>;
    getPongPayload?: (websocket: Websocket<Ping, Pong>) => Promise<Pong>;
    isPingMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
    isPongMessage?: (websocket: Websocket<Ping, Pong>, message: any) => boolean;
  }): this {
    this.isPingingFrames = input.isPingingFrames;
    this.pingInitiator = input.pingInitiator;
    this.pingInterval = input.pingInterval;
    this.getPingPayload = input.getPingPayload;
    this.getPongPayload = input.getPongPayload;
    this.isPingMessage = input.isPingMessage;
    this.isPongMessage = input.isPongMessage;
    return this;
  }

  public waitBeforeSend(waitBeforeSend: (websocket: Websocket<Ping, Pong>) => Promise<void>): this {
    this.waitSend = waitBeforeSend;
    return this;
  }

  public build(options?: Partial<ClientOptions | ClientRequestArgs | undefined>): Websocket<Ping, Pong> {
    return new Websocket<Ping, Pong>(
      {
        id: this.id,
        url: this.url,
        timeout: this.timeout,
        lifetime: this.lifetime,
        lifetimeCallback: this.lifetimeCallback,
        isPingingFrames: this.isPingingFrames,
        pingInitiator: this.pingInitiator,
        pingInterval: this.pingInterval,
        getPingPayload: this.getPingPayload,
        getPongPayload: this.getPongPayload,
        isPingMessage: this.isPingMessage,
        isPongMessage: this.isPongMessage,
        waitSend: this.waitSend,
      },
      options,
    );
  }
}
