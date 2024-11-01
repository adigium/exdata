import { v4 as uuid } from 'uuid';
import { ConfigurationService } from '@services/core';
import { TopicSpecification, WebsocketSpecification } from '../../base';
import { Websocket } from '../../types';
import { Binance } from './definitions';
import { BinanceTopicBalanceUpdates, BinanceTopicDepthFull, BinanceTopicDepthLight } from './topic';

type BinancePayloads = Binance.Websocket.Payloads;
type BinanceMessages = Binance.Websocket.Messages;
type BinanceChannelEnum = Binance.Websocket.Channel;
type BinanceTopicEnum = Binance.Websocket.Topic;
const BinanceChannel = Binance.Websocket.Channel;
const BinanceTopic = Binance.Websocket.Topic;

export class BinanceWebsocketSpecification
  implements WebsocketSpecification<BinancePayloads, BinanceMessages, BinanceTopicEnum, BinanceChannelEnum>
{
  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<BinanceTopicEnum>;
  public topicSpecification: TopicSpecification<BinanceMessages>;
  public topicChannel: Websocket.Map.UTopicChannel<BinanceChannelEnum>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<BinanceChannelEnum>;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<BinanceChannelEnum>;

  constructor(private configuration: ConfigurationService) {
    this.uid = this.configuration.BINANCE_UID;

    this.topicMap = {
      [Websocket.Topic.DEPTH_FULL]: BinanceTopic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: BinanceTopic.DEPTH_LIGHT,
      [Websocket.Topic.BALANCE_UPDATES]: BinanceTopic.BALANCE_UPDATES,
    };

    this.topicSpecification = {
      [Websocket.Topic.DEPTH_FULL]: new BinanceTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new BinanceTopicDepthLight(),
      [Websocket.Topic.BALANCE_UPDATES]: new BinanceTopicBalanceUpdates(),
    };

    this.topicChannel = {
      [Websocket.Topic.DEPTH_FULL]: BinanceChannel.PUBLIC,
      [Websocket.Topic.DEPTH_LIGHT]: BinanceChannel.PUBLIC,
      [Websocket.Topic.BALANCE_UPDATES]: BinanceChannel.USER_DATA,
    };

    this.topicAuthentication = {
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [BinanceChannel.PUBLIC]: Websocket.Auth.NONE,
      [BinanceChannel.USER_DATA]: Websocket.Auth.CONNECTION_STRING,
    };

    this.channelPresubscription = {
      [BinanceChannel.PUBLIC]: [],
      [BinanceChannel.USER_DATA]: [Websocket.Topic.BALANCE_UPDATES],
    };
  }

  public async getWebsocketUrl(channel: BinanceChannelEnum): Promise<string> {
    if (channel === BinanceChannel.PUBLIC) return Binance.Constant.PUBLIC_WEBSOCKET_URL;
    if (channel === BinanceChannel.USER_DATA) return Binance.Constant.USER_DATA_WEBSOCKET_URL;

    throw new Error(`Unknown channel type: ${channel}`);
  }

  public getMessageContext(
    data: BinanceMessages[keyof BinanceMessages],
  ): Websocket.MessageContext<BinanceTopicEnum> {
    const possibleTypes: Websocket.MessageContext<any>['possibleMessageTypes'] = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: BinanceTopicEnum | undefined;
    let subjects: string[] | undefined;
    let error: string | undefined;

    if ('id' in data) {
      possibleTypes.push(Websocket.Action.SUBSCRIBE, Websocket.Action.UNSUBSCRIBE);
      success = data.result === null;
      requestId = data.id?.toString();
      error = data.error?.msg;
    }
    if ('stream' in data) {
      const [streamSubject, streamTopic] = data.stream.split('@');

      if (streamTopic === BinanceTopic.DEPTH_FULL) {
        possibleTypes.push(Websocket.Topic.DEPTH_FULL);
        topic = BinanceTopic.DEPTH_FULL;
      }
      if (streamTopic === BinanceTopic.DEPTH_LIGHT) {
        possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);
        topic = BinanceTopic.DEPTH_LIGHT;
      }

      success = true;
      subjects = [streamSubject];
    }
    if ('e' in data) {
      if (data.e === BinanceTopic.BALANCE_UPDATES) {
        possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);
        topic = BinanceTopic.BALANCE_UPDATES;
      }

      success = true;
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
    streams: Websocket.Stream<Websocket.Map.UTopicITopic<BinanceTopicEnum>>[];
  }): Promise<Websocket.MessagePayloads<BinancePayloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<BinancePayloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Binance.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Binance.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();
      payloads.push({
        requestId,
        type: Websocket.Action.SUBSCRIBE,
        message: {
          id: requestId,
          method: 'SUBSCRIBE',
          params: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream<Websocket.Map.UTopicITopic<BinanceTopicEnum>>[];
  }): Promise<Websocket.MessagePayloads<BinancePayloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<BinancePayloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i += Binance.Constant.MAX_STREAMS_PER_PAYLOAD) {
      const chunk = streams.slice(i, i + Binance.Constant.MAX_STREAMS_PER_PAYLOAD);
      const requestId = uuid();

      payloads.push({
        requestId,
        type: Websocket.Action.UNSUBSCRIBE,
        message: {
          id: requestId,
          method: 'UNSUBSCRIBE',
          params: chunk.map((stream) => this.getStreamName(stream.innerTopic, stream.innerSubject)),
        },
        streams: chunk,
      });
    }

    return payloads;
  }

  private getStreamName(topic: BinanceTopicEnum, subject?: string): string {
    return subject ? `${subject.toLowerCase()}@${topic.toLowerCase()}` : topic;
  }
}
