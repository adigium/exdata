import { ClientRequestArgs } from 'http';
import { v4 as uuid } from 'uuid';
import { ClientOptions } from 'ws';
import { ExchangeID } from '@entities';
import { Websocket } from '@adapters/module-exchange-ws-client/types';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { TopicSpecification, WebsocketSpecification } from '../../base';
import { Poloniex } from './definitions';
import { PoloniexTopicBalanceUpdates, PoloniexTopicDepthFull, PoloniexTopicDepthLight } from './topic';

export class PoloniexWebsocketSpecification
  implements
    WebsocketSpecification<
      Poloniex.Websocket.Payloads,
      Poloniex.Websocket.Messages,
      Poloniex.Websocket.Topic,
      Poloniex.Websocket.Channel
    >
{
  public exchangeId: ExchangeID.Poloniex = ExchangeID.Poloniex;

  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<Poloniex.Websocket.Topic>;
  public topicSpecification: TopicSpecification<Poloniex.Websocket.Messages>;
  public topicChannel: Websocket.Map.UTopicITopic<Poloniex.Websocket.Channel>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<Poloniex.Websocket.Channel>;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<Poloniex.Websocket.Channel>;

  constructor(private configuration: ConfigurationService) {
    this.uid = this.configuration.POLONIEX_UID;

    this.topicMap = {
      [Websocket.Topic.DEPTH_FULL]: Poloniex.Websocket.Topic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: Poloniex.Websocket.Topic.DEPTH_LIGHT,
      [Websocket.Topic.BALANCE_UPDATES]: Poloniex.Websocket.Topic.BALANCE_UPDATES,
    };

    this.topicSpecification = {
      [Websocket.Topic.DEPTH_FULL]: new PoloniexTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new PoloniexTopicDepthLight(),
      [Websocket.Topic.BALANCE_UPDATES]: new PoloniexTopicBalanceUpdates(),
    };

    this.topicChannel = {
      [Websocket.Topic.DEPTH_FULL]: Poloniex.Websocket.Channel.PUBLIC,
      [Websocket.Topic.DEPTH_LIGHT]: Poloniex.Websocket.Channel.PUBLIC,
      [Websocket.Topic.BALANCE_UPDATES]: Poloniex.Websocket.Channel.PRIVATE,
    };

    this.topicAuthentication = {
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [Poloniex.Websocket.Channel.PUBLIC]: Websocket.Auth.NONE,
      [Poloniex.Websocket.Channel.PRIVATE]: Websocket.Auth.ONE_MESSAGE,
    };

    this.channelPresubscription = {
      [Poloniex.Websocket.Channel.PUBLIC]: [],
      [Poloniex.Websocket.Channel.PRIVATE]: [],
    };
  }

  public async getWebsocketUrl(channel: Poloniex.Websocket.Channel): Promise<string> {
    if (channel === Poloniex.Websocket.Channel.PRIVATE) return Poloniex.Constant.PRIVATE_WEBSOCKET_URL;
    if (channel === Poloniex.Websocket.Channel.PUBLIC) return Poloniex.Constant.PUBLIC_WEBSOCKET_URL;

    throw new Error(`Unknown channel: ${channel}`);
  }

  public async getWebsocketOptions(): Promise<ClientOptions | ClientRequestArgs | undefined> {
    return undefined;
  }

  public getMessageContext(
    data: Poloniex.Websocket.Messages[keyof Poloniex.Websocket.Messages],
  ): Websocket.MessageContext<Poloniex.Websocket.Topic> {
    const possibleTypes: (Websocket.Action | Websocket.Topic)[] = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: Poloniex.Websocket.Topic | undefined;
    let subjects: string[] | undefined;
    let error: string | undefined;

    if ('event' in data && data.event === 'pong') {
      possibleTypes.push(Websocket.Action.PONG);
      success = true;
    }
    if ('event' in data && data.event === 'subscribe') {
      possibleTypes.push(Websocket.Action.SUBSCRIBE);
      success = true;
      topic = data.channel as Poloniex.Websocket.Topic;
      subjects = data?.symbols;
    }
    if ('event' in data && data.event === 'unsubscribe') {
      possibleTypes.push(Websocket.Action.UNSUBSCRIBE);
      success = true;
      topic = data.channel as Poloniex.Websocket.Topic;
      subjects = data?.symbols;
    }
    if ('channel' in data && 'data' in data) {
      if (data.channel === 'auth') {
        success = data.data.success;
        possibleTypes.push(Websocket.Action.AUTH);
      }
      if (data.channel === Poloniex.Websocket.Topic.DEPTH_FULL) {
        topic = data.channel;
        subjects = data.data.map((item) => item.symbol);
        possibleTypes.push(Websocket.Topic.DEPTH_FULL);
      }
      if (data.channel === Poloniex.Websocket.Topic.DEPTH_LIGHT) {
        topic = data.channel;
        subjects = data.data.map((item) => item.symbol);
        possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);
      }
      if (data.channel === Poloniex.Websocket.Topic.BALANCE_UPDATES) {
        topic = data.channel;
        subjects = undefined;
        possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);
      }

      success = true;
    }

    return {
      possibleMessageTypes: possibleTypes,
      success,
      requestId,
      topic,
      subjects,
      error,
    };
  }

  public async getSubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Poloniex.Websocket.Payloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Poloniex.Websocket.Payloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Poloniex.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Poloniex.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();

      let message: Poloniex.Websocket.Payloads[Websocket.Action.SUBSCRIBE] | undefined;

      if (chunk[0]?.topic === Websocket.Topic.DEPTH_FULL) {
        message = {
          event: 'subscribe',
          channel: [Poloniex.Websocket.Topic.DEPTH_FULL],
          symbols: chunk.map((stream) => stream.innerSubject!),
          depth: Poloniex.Constant.DEPTH_FULL_LEVEL,
        };
      }
      if (chunk[0]?.topic === Websocket.Topic.DEPTH_LIGHT) {
        message = {
          event: 'subscribe',
          channel: [Poloniex.Websocket.Topic.DEPTH_LIGHT],
          symbols: chunk.map((stream) => stream.innerSubject!),
        };
      }
      if (chunk[0]?.topic === Websocket.Topic.BALANCE_UPDATES) {
        message = {
          event: 'subscribe',
          channel: [Poloniex.Websocket.Topic.BALANCE_UPDATES],
        };
      }

      if (!message) throw new Error('Unknown message type');

      payloads.push({
        requestId,
        type: Websocket.Action.SUBSCRIBE,
        message,
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Poloniex.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Poloniex.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Poloniex.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Poloniex.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();

      let message: Poloniex.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE] | undefined;

      if (chunk[0]?.topic === Websocket.Topic.DEPTH_FULL) {
        message = {
          event: 'unsubscribe',
          channel: [Poloniex.Websocket.Topic.DEPTH_FULL],
          symbols: chunk.map((stream) => stream.innerSubject!),
          depth: Poloniex.Constant.DEPTH_FULL_LEVEL,
        };
      }
      if (chunk[0]?.topic === Websocket.Topic.DEPTH_LIGHT) {
        message = {
          event: 'unsubscribe',
          channel: [Poloniex.Websocket.Topic.DEPTH_LIGHT],
          symbols: chunk.map((stream) => stream.innerSubject!),
        };
      }
      if (chunk[0]?.topic === Websocket.Topic.BALANCE_UPDATES) {
        message = {
          event: 'unsubscribe',
          channel: [Poloniex.Websocket.Topic.BALANCE_UPDATES],
        };
      }

      if (!message) throw new Error('Unknown message type');

      payloads.push({
        requestId,
        type: Websocket.Action.UNSUBSCRIBE,
        message,
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getPingPayload(): Promise<Poloniex.Websocket.Payloads[Websocket.Action.PING]> {
    return {
      event: 'ping',
    };
  }

  public getPongPayload(): Promise<Poloniex.Websocket.Payloads[Websocket.Action.PONG]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public isPingMessage?: (
    websocket: WebsocketClass<
      Poloniex.Websocket.Payloads[Websocket.Action.PING],
      Poloniex.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Poloniex.Websocket.Messages[keyof Poloniex.Websocket.Messages],
  ) => boolean = () => false;

  public isPongMessage?: (
    websocket: WebsocketClass<
      Poloniex.Websocket.Payloads[Websocket.Action.PING],
      Poloniex.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Poloniex.Websocket.Messages[keyof Poloniex.Websocket.Messages],
  ) => boolean = (_, message) => 'event' in message && message.event === 'pong';
}
