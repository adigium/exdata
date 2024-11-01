import { Websocket } from '../../types';
import { ConnectionStringStrategy } from './ConnectionStringStrategy';
import { OneMessageStrategy } from './OneMessageStrategy';
import { PerMessageStrategy } from './PerMessageStrategy';

export type WebsocketAuthentication<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> = {
  [Websocket.Auth.NONE]?: never;
  [Websocket.Auth.CONNECTION_STRING]?: ConnectionStringStrategy<TChannel>;
  [Websocket.Auth.ONE_MESSAGE]?: OneMessageStrategy<TPayloads, TMessages, TInnerTopic, TChannel>;
  [Websocket.Auth.PER_MESSAGE]?: PerMessageStrategy<TPayloads>;
};
