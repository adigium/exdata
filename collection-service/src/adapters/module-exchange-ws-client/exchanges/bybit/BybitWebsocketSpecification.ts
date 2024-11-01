import { v4 as uuid } from 'uuid';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { WebsocketSpecification } from '../../base/WebsocketSpecification';
import { TopicSpecification } from '../../base/handlers/TopicSpecification';
import { Websocket } from '../../types';
import { Bybit } from './definitions';
import { BybitTopicBalanceUpdates } from './topic/BybitTopicBalanceUpdates';
import { BybitTopicDepthFull } from './topic/BybitTopicDepthFull';
import { BybitTopicDepthLight } from './topic/BybitTopicDepthLight';

export class BybitWebsocketSpecification
  implements
    WebsocketSpecification<
      Bybit.Websocket.Payloads,
      Bybit.Websocket.Messages,
      Bybit.Websocket.Topic,
      Bybit.Websocket.Channel
    >
{
  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<Bybit.Websocket.Topic>;
  public topicSpecification: TopicSpecification<Bybit.Websocket.Messages>;
  public topicChannel: Websocket.Map.UTopicChannel<Bybit.Websocket.Channel>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<Bybit.Websocket.Channel>;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<Bybit.Websocket.Channel>;

  constructor(private configuration: ConfigurationService) {
    this.uid = this.configuration.BYBIT_UID;

    this.topicMap = {
      [Websocket.Topic.DEPTH_FULL]: Bybit.Websocket.Topic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: Bybit.Websocket.Topic.DEPTH_LIGHT,
      [Websocket.Topic.BALANCE_UPDATES]: Bybit.Websocket.Topic.BALANCE_UPDATES,
    };

    this.topicChannel = {
      [Websocket.Topic.DEPTH_FULL]: Bybit.Websocket.Channel.PUBLIC,
      [Websocket.Topic.DEPTH_LIGHT]: Bybit.Websocket.Channel.PUBLIC,
      [Websocket.Topic.BALANCE_UPDATES]: Bybit.Websocket.Channel.PRIVATE,
    };

    this.topicSpecification = {
      [Websocket.Topic.DEPTH_FULL]: new BybitTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new BybitTopicDepthLight(),
      [Websocket.Topic.BALANCE_UPDATES]: new BybitTopicBalanceUpdates(),
    };

    this.topicAuthentication = {
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [Bybit.Websocket.Channel.PUBLIC]: Websocket.Auth.NONE,
      [Bybit.Websocket.Channel.PRIVATE]: Websocket.Auth.ONE_MESSAGE,
    };

    this.channelPresubscription = {
      [Bybit.Websocket.Channel.PUBLIC]: [],
      [Bybit.Websocket.Channel.PRIVATE]: [],
    };
  }

  public async getWebsocketUrl(channel: Bybit.Websocket.Channel): Promise<string> {
    if (channel === Bybit.Websocket.Channel.PRIVATE) return Bybit.Constant.PRIVATE_WEBSOCKET_URL;
    if (channel === Bybit.Websocket.Channel.PUBLIC) return Bybit.Constant.PUBLIC_WEBSOCKET_URL;

    throw new Error(`Unknown channel: ${channel}`);
  }

  public getMessageContext(
    data: Bybit.Websocket.Messages[keyof Bybit.Websocket.Messages],
  ): Websocket.MessageContext<Bybit.Websocket.Topic> {
    const possibleTypes: Array<Websocket.Action | Websocket.Topic> = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: Bybit.Websocket.Topic | undefined;
    let subjects: string[] | undefined;

    if ('op' in data && data.op === 'auth') {
      possibleTypes.push(Websocket.Action.AUTH);
      success = data.success;
      requestId = data.req_id;
    }
    if ('op' in data && data.op === 'ping') {
      possibleTypes.push(Websocket.Action.PONG);
      success = data.success;
      requestId = data.req_id;
    }
    if ('op' in data && data.op === 'subscribe') {
      possibleTypes.push(Websocket.Action.SUBSCRIBE);
      success = data.success;
      requestId = data.req_id;
    }
    if ('op' in data && data.op === 'unsubscribe') {
      possibleTypes.push(Websocket.Action.UNSUBSCRIBE);
      success = data.success;
      requestId = data.req_id;
    }
    if ('topic' in data && data.topic.startsWith('orderbook.')) {
      const [type, level, subject] = data.topic.split('.');
      const innerTopic = `${type}.${level}`;

      if (innerTopic === Bybit.Websocket.Topic.DEPTH_FULL) {
        possibleTypes.push(Websocket.Topic.DEPTH_FULL);
        topic = innerTopic;
      }
      if (innerTopic === Bybit.Websocket.Topic.DEPTH_LIGHT) {
        possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);
        topic = innerTopic;
      }

      success = true;
      subjects = [subject];
    }
    if ('topic' in data && data.topic === Bybit.Websocket.Topic.BALANCE_UPDATES) {
      possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);
      topic = Bybit.Websocket.Topic.BALANCE_UPDATES;
      success = true;
      subjects = [];
    }

    return {
      possibleMessageTypes: possibleTypes,
      success,
      requestId,
      topic,
      subjects,
      error: undefined,
    };
  }

  public async getSubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Bybit.Websocket.Payloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Bybit.Websocket.Payloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Bybit.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Bybit.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();
      payloads.push({
        requestId,
        type: Websocket.Action.SUBSCRIBE,
        message: {
          req_id: requestId,
          op: 'subscribe',
          args: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Bybit.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Bybit.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Bybit.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Bybit.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();
      payloads.push({
        requestId,
        type: Websocket.Action.UNSUBSCRIBE,
        message: {
          req_id: requestId,
          op: 'unsubscribe',
          args: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getPingPayload(props: {
    id: string;
  }): Promise<Bybit.Websocket.Payloads[Websocket.Action.PING]> {
    return {
      op: 'ping',
      req_id: props.id,
    };
  }

  public getPongPayload(): Promise<Bybit.Websocket.Payloads[Websocket.Action.PONG]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public isPingMessage?: (
    websocket: WebsocketClass<
      Bybit.Websocket.Payloads[Websocket.Action.PING],
      Bybit.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Bybit.Websocket.Messages[keyof Bybit.Websocket.Messages],
  ) => boolean = () => false;

  public isPongMessage?: (
    websocket: WebsocketClass<
      Bybit.Websocket.Payloads[Websocket.Action.PING],
      Bybit.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Bybit.Websocket.Messages[keyof Bybit.Websocket.Messages],
  ) => boolean = (_, message) => 'op' in message && message.op === 'ping';

  private getStreamName(topic: Websocket.Topic, subject?: string): string {
    return subject ? `${topic}.${subject}` : topic;
  }
}
