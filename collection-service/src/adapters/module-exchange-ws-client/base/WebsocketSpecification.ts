import { ClientRequestArgs } from 'http';
import { ClientOptions } from 'ws';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { Websocket } from '../types';
import { TopicSpecification } from './handlers/TopicSpecification';

export interface WebsocketSpecification<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> {
  uid: string;

  topicMap: Websocket.Map.UTopicITopic<TInnerTopic>;
  topicSpecification: TopicSpecification<TMessages>;
  topicChannel: Websocket.Map.UTopicChannel<TChannel>;
  topicAuthentication: Websocket.Map.UTopicAuthentication;
  channelAuthentication: Websocket.Map.ChannelAuthentication<TChannel>;
  channelPresubscription: Websocket.Map.ChannelUTopicArray<TChannel>;

  getWebsocketUrl(channel: TChannel, websocketId: string): Promise<string>;
  getWebsocketOptions?: (
    channel: TChannel,
    websocketId: string,
  ) => Promise<ClientOptions | ClientRequestArgs | undefined>;

  getWebsocketOpenCallback?: (
    channel: TChannel,
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
  ) => () => Promise<void>;
  getWebsocketCloseCallback?: (
    channel: TChannel,
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
  ) => () => Promise<void>;

  getMessageContext(data: TMessages[keyof TMessages]): Websocket.MessageContext<TInnerTopic>;

  getSubscribePayloads(props: {
    streams: Websocket.Stream<Websocket.Map.UTopicITopic<TInnerTopic>>[];
  }): Promise<Websocket.MessagePayloads<TPayloads[Websocket.Action.SUBSCRIBE]>>;
  getUnsubscribePayloads(props: {
    streams: Websocket.Stream<Websocket.Map.UTopicITopic<TInnerTopic>>[];
  }): Promise<Websocket.MessagePayloads<TPayloads[Websocket.Action.UNSUBSCRIBE]>>;

  getPingPayload?: (
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
  ) => Promise<TPayloads[Websocket.Action.PING]>;
  getPongPayload?: (
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
  ) => Promise<TPayloads[Websocket.Action.PONG]>;

  isPingMessage?: (
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
    message: TMessages[keyof TMessages],
  ) => boolean;
  isPongMessage?: (
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
    message: TMessages[keyof TMessages],
  ) => boolean;
}
