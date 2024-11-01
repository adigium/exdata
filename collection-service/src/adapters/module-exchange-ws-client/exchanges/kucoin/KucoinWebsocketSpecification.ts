import { v4 as uuid } from 'uuid';
import { ExchangeID } from '@entities';
import { RateLimiterModule } from '@modules';
import { KucoinApiClient } from '@adapters/module-exchange-client';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { WebsocketSpecification } from '../../base/WebsocketSpecification';
import { TopicSpecification } from '../../base/handlers/TopicSpecification';
import { Websocket } from '../../types';
import { Kucoin } from './definitions';
import { KucoinTopicBalanceUpdates, KucoinTopicDepthFull, KucoinTopicDepthLight } from './topic';

export class KucoinWebsocketSpecification
  implements
    WebsocketSpecification<
      Kucoin.Websocket.Payloads,
      Kucoin.Websocket.Messages,
      Kucoin.Websocket.Topic,
      Kucoin.Websocket.Channel
    >
{
  public exchangeId: ExchangeID.Kucoin = ExchangeID.Kucoin;

  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<Kucoin.Websocket.Topic>;
  public topicSpecification: TopicSpecification<Kucoin.Websocket.Messages>;
  public topicChannel: Websocket.Map.UTopicITopic<Kucoin.Websocket.Channel>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<Kucoin.Websocket.Channel>;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<Kucoin.Websocket.Channel>;

  constructor(
    private configuration: ConfigurationService,
    private rateLimiter: RateLimiterModule,
    private exchangeClient: KucoinApiClient<any>,
  ) {
    this.uid = this.configuration.KUCOIN_UID;

    this.topicMap = {
      [Websocket.Topic.DEPTH_FULL]: Kucoin.Websocket.Topic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: Kucoin.Websocket.Topic.DEPTH_LIGHT,
      [Websocket.Topic.BALANCE_UPDATES]: Kucoin.Websocket.Topic.BALANCE_UPDATES,
    };

    this.topicSpecification = {
      [Websocket.Topic.DEPTH_FULL]: new KucoinTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new KucoinTopicDepthLight(),
      [Websocket.Topic.BALANCE_UPDATES]: new KucoinTopicBalanceUpdates(),
    };

    this.topicChannel = {
      [Websocket.Topic.DEPTH_FULL]: Kucoin.Websocket.Channel.PUBLIC,
      [Websocket.Topic.DEPTH_LIGHT]: Kucoin.Websocket.Channel.PUBLIC,
      [Websocket.Topic.BALANCE_UPDATES]: Kucoin.Websocket.Channel.PRIVATE,
    };

    this.topicAuthentication = {
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [Kucoin.Websocket.Channel.PUBLIC]: Websocket.Auth.CONNECTION_STRING,
      [Kucoin.Websocket.Channel.PRIVATE]: Websocket.Auth.CONNECTION_STRING,
    };

    this.channelPresubscription = {
      [Kucoin.Websocket.Channel.PUBLIC]: [],
      [Kucoin.Websocket.Channel.PRIVATE]: [],
    };
  }

  public async getWebsocketUrl(): Promise<string> {
    return Websocket.Constants.AUTH_PLACEHOLDER;
  }

  public getMessageContext(
    data: Kucoin.Websocket.Messages[keyof Kucoin.Websocket.Messages],
  ): Websocket.MessageContext<Kucoin.Websocket.Topic> {
    const possibleTypes: (Websocket.Action | Websocket.Topic)[] = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: Kucoin.Websocket.Topic | undefined;
    let subjects: string[] | undefined;
    let error: string | undefined;

    if (data.type === 'pong') {
      possibleTypes.push(Websocket.Action.PONG);
      success = true;
      requestId = data.id.toString();
    }
    if (data.type === 'ack') {
      possibleTypes.push(Websocket.Action.SUBSCRIBE, Websocket.Action.UNSUBSCRIBE);
      success = true;
      requestId = data.id.toString();
    }
    if (data.type === 'message') {
      if (data.topic.startsWith(Kucoin.Websocket.Topic.DEPTH_FULL)) {
        possibleTypes.push(Websocket.Topic.DEPTH_FULL);
        topic = Kucoin.Websocket.Topic.DEPTH_FULL;
        subjects = data.topic?.split(':')[1]?.split(',');
      }
      if (data.topic.startsWith(Kucoin.Websocket.Topic.DEPTH_LIGHT)) {
        possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);
        topic = Kucoin.Websocket.Topic.DEPTH_LIGHT;
        subjects = data.topic?.split(':')[1]?.split(',');
      }
      if (data.topic.startsWith(Kucoin.Websocket.Topic.BALANCE_UPDATES)) {
        possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);
        topic = Kucoin.Websocket.Topic.BALANCE_UPDATES;
        subjects = undefined;
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
  }): Promise<Websocket.MessagePayloads<Kucoin.Websocket.Payloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Kucoin.Websocket.Payloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Kucoin.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Kucoin.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();
      payloads.push({
        requestId,
        type: Websocket.Action.SUBSCRIBE,
        message: {
          id: requestId,
          type: 'subscribe',
          topic: `${chunk[0]?.innerTopic}:${chunk.map((stream) => stream.innerSubject).join(',')}`,
          privateChannel: false,
          response: true,
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Kucoin.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Kucoin.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Kucoin.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Kucoin.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();
      payloads.push({
        requestId,
        type: Websocket.Action.UNSUBSCRIBE,
        message: {
          id: requestId,
          type: 'unsubscribe',
          topic: `${streams[0]?.innerTopic}:${streams.map((stream) => stream.innerSubject).join(',')}`,
          privateChannel: false,
          response: true,
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getPingPayload(props: {
    id: string;
  }): Promise<Kucoin.Websocket.Payloads[Websocket.Action.PING]> {
    return {
      type: 'ping',
      id: props.id,
    };
  }

  public getPongPayload(): Promise<Kucoin.Websocket.Payloads[Websocket.Action.PONG]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public isPingMessage?: (
    websocket: WebsocketClass<
      Kucoin.Websocket.Payloads[Websocket.Action.PING],
      Kucoin.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Kucoin.Websocket.Messages[keyof Kucoin.Websocket.Messages],
  ) => boolean = () => false;

  public isPongMessage?: (
    websocket: WebsocketClass<
      Kucoin.Websocket.Payloads[Websocket.Action.PING],
      Kucoin.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Kucoin.Websocket.Messages[keyof Kucoin.Websocket.Messages],
  ) => boolean = (_, message) => 'type' in message && message.type === 'pong';
}
