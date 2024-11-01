import { Websocket } from '@adapters/module-exchange-ws-client/types';

export interface ExchangeWebsocketModule {
  subscribe(props: { topic: Websocket.Topic; symbols: string[] }): Promise<void>;
  unsubscribe(props: { topic: Websocket.Topic; symbols: string[] }): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;

  getActiveStreams<T extends keyof Websocket.Streams.UTopicSubject>(topic: T): Websocket.Stream<any, T>[];
}
