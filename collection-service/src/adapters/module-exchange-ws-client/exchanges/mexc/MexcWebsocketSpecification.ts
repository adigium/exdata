import { ExchangeID } from '@entities';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { WebsocketSpecification } from '../../base/WebsocketSpecification';
import { TopicSpecification } from '../../base/handlers/TopicSpecification';
import { Websocket } from '../../types';
import { Mexc } from './definitions';
import { MexcTopicBalanceUpdates, MexcTopicDepthFull, MexcTopicDepthLight } from './topic';

export class MexcWebsocketSpecification
  implements
    WebsocketSpecification<
      Mexc.Websocket.Payloads,
      Mexc.Websocket.Messages,
      Mexc.Websocket.Topic,
      Mexc.Websocket.Channel
    >
{
  public exchangeId: ExchangeID.Mexc = ExchangeID.Mexc;

  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<Mexc.Websocket.Topic>;
  public topicSpecification: TopicSpecification<Mexc.Websocket.Messages>;
  public topicChannel: Websocket.Map.UTopicITopic<Mexc.Websocket.Channel>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<Mexc.Websocket.Channel>;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<Mexc.Websocket.Channel>;

  constructor(private configuration: ConfigurationService) {
    this.uid = this.configuration.MEXC_UID;

    this.topicMap = {
      [Websocket.Topic.DEPTH_FULL]: Mexc.Websocket.Topic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: Mexc.Websocket.Topic.DEPTH_LIGHT,
      [Websocket.Topic.BALANCE_UPDATES]: Mexc.Websocket.Topic.BALANCE_UPDATES,
    };

    this.topicSpecification = {
      [Websocket.Topic.DEPTH_FULL]: new MexcTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new MexcTopicDepthLight(),
      [Websocket.Topic.BALANCE_UPDATES]: new MexcTopicBalanceUpdates(),
    };

    this.topicChannel = {
      [Websocket.Topic.DEPTH_FULL]: Mexc.Websocket.Channel.PUBLIC,
      [Websocket.Topic.DEPTH_LIGHT]: Mexc.Websocket.Channel.PUBLIC,
      [Websocket.Topic.BALANCE_UPDATES]: Mexc.Websocket.Channel.USER_DATA,
    };

    this.topicAuthentication = {
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [Mexc.Websocket.Channel.PUBLIC]: Websocket.Auth.NONE,
      [Mexc.Websocket.Channel.USER_DATA]: Websocket.Auth.CONNECTION_STRING,
    };

    this.channelPresubscription = {
      [Mexc.Websocket.Channel.PUBLIC]: [],
      [Mexc.Websocket.Channel.USER_DATA]: [],
    };
  }

  public async getWebsocketUrl(channel: Mexc.Websocket.Channel): Promise<string> {
    if (channel === Mexc.Websocket.Channel.PUBLIC) return Mexc.Constant.PUBLIC_WEBSOCKET_URL;
    if (channel === Mexc.Websocket.Channel.USER_DATA) return Mexc.Constant.USER_DATA_WEBSOCKET_URL;

    throw new Error(`Unknown channel type: ${channel}`);
  }

  public getMessageContext(
    data: Mexc.Websocket.Messages[keyof Mexc.Websocket.Messages],
  ): Websocket.MessageContext<Mexc.Websocket.Topic> {
    const possibleTypes: (Websocket.Action | Websocket.Topic)[] = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: Mexc.Websocket.Topic | undefined;
    let subjects: string[] | undefined;
    let error: string | undefined;

    if ('id' in data && data.msg !== 'PONG') {
      possibleTypes.push(Websocket.Action.SUBSCRIBE, Websocket.Action.UNSUBSCRIBE);
      success = data.id !== 0;
      requestId = data.id.toString();
      error = data.id === 0 && data.code === 0 ? data.msg : undefined;
    }
    if ('id' in data && data.msg === 'PONG') {
      possibleTypes.push(Websocket.Action.PONG);
      requestId = '0';
      success = true;
    }
    if ('s' in data && 'c' in data && 'e' in data.d) {
      const innerTopic = data.d.e;

      if (innerTopic === Mexc.Websocket.Topic.DEPTH_FULL) possibleTypes.push(Websocket.Topic.DEPTH_FULL);
      if (innerTopic === Mexc.Websocket.Topic.DEPTH_LIGHT) possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);

      success = true;
      topic = innerTopic;
      subjects = [data.s];
    }
    if ('c' in data && data.c === Mexc.Websocket.Topic.BALANCE_UPDATES) {
      possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);

      success = true;
      topic = Mexc.Websocket.Topic.BALANCE_UPDATES;
      subjects = undefined;
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
  }): Promise<Websocket.MessagePayloads<Mexc.Websocket.Payloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Mexc.Websocket.Payloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Mexc.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Mexc.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = this.generateRequestId();
      payloads.push({
        requestId: requestId.toString(),
        type: Websocket.Action.SUBSCRIBE,
        message: {
          id: requestId,
          method: 'SUBSCRIPTION',
          params: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Mexc.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Mexc.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Mexc.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Mexc.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = this.generateRequestId();
      payloads.push({
        requestId: requestId.toString(),
        type: Websocket.Action.UNSUBSCRIBE,
        message: {
          id: requestId,
          method: 'UNSUBSCRIPTION',
          params: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getPingPayload(): Promise<Mexc.Websocket.Payloads[Websocket.Action.PING]> {
    return {
      id: 0,
      method: 'PING',
    };
  }

  public getPongPayload(): Promise<Mexc.Websocket.Payloads[Websocket.Action.PONG]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public isPingMessage?: (
    websocket: WebsocketClass<
      Mexc.Websocket.Payloads[Websocket.Action.PING],
      Mexc.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Mexc.Websocket.Messages[keyof Mexc.Websocket.Messages],
  ) => boolean = () => false;

  public isPongMessage?: (
    websocket: WebsocketClass<
      Mexc.Websocket.Payloads[Websocket.Action.PING],
      Mexc.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Mexc.Websocket.Messages[keyof Mexc.Websocket.Messages],
  ) => boolean = (_, message) => 'msg' in message && message.msg === 'PONG';

  private getStreamName(topic: Mexc.Websocket.Topic, subject?: string): string {
    if (topic === Mexc.Websocket.Topic.BALANCE_UPDATES) {
      return topic;
    }
    if (topic === Mexc.Websocket.Topic.DEPTH_FULL) {
      if (!subject) throw new Error('Subject is required for depth full topic');
      return `${topic}@${subject}`;
    }
    if (topic === Mexc.Websocket.Topic.DEPTH_LIGHT) {
      if (!subject) throw new Error('Subject is required for depth light topic');
      return `${topic}@${subject}@${Mexc.Constant.DEPTH_LIGHT_LEVEL}`;
    }

    throw new Error(`Unknown topic: ${topic}`);
  }

  private generateRequestId() {
    return Math.round((Math.random() * 100 * Date.now()) / (Math.random() * 1000));
  }
}
