import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { WebsocketSpecification } from '../../base/WebsocketSpecification';
import { TopicSpecification } from '../../base/handlers/TopicSpecification';
import { Websocket } from '../../types';
import { Gate } from './definitions';
import { GateTopicBalanceUpdates, GateTopicDepthFull, GateTopicDepthLight } from './topic';

export class GateWebsocketSpecification
  implements
    WebsocketSpecification<
      Gate.Websocket.Payloads,
      Gate.Websocket.Messages,
      Gate.Websocket.Topic,
      Gate.Websocket.Channel
    >
{
  public uid: string;
  public topicMap: Websocket.Map.UTopicITopic<Gate.Websocket.Topic>;
  public topicSpecification: TopicSpecification<Gate.Websocket.Messages>;
  public topicChannel: Websocket.Map.UTopicChannel<Gate.Websocket.Channel>;
  public topicAuthentication: Websocket.Map.UTopicAuthentication;
  public channelAuthentication: Websocket.Map.ChannelAuthentication<Gate.Websocket.Channel>;
  public channelPresubscription: Websocket.Map.ChannelUTopicArray<Gate.Websocket.Channel>;

  constructor(private configuration: ConfigurationService) {
    this.uid = this.configuration.GATE_UID;

    this.topicMap = {
      [Websocket.Topic.BALANCE_UPDATES]: Gate.Websocket.Topic.BALANCE_UPDATES,
      [Websocket.Topic.DEPTH_FULL]: Gate.Websocket.Topic.DEPTH_FULL,
      [Websocket.Topic.DEPTH_LIGHT]: Gate.Websocket.Topic.DEPTH_LIGHT,
    };

    this.topicSpecification = {
      [Websocket.Topic.BALANCE_UPDATES]: new GateTopicBalanceUpdates(),
      [Websocket.Topic.DEPTH_FULL]: new GateTopicDepthFull(),
      [Websocket.Topic.DEPTH_LIGHT]: new GateTopicDepthLight(),
    };

    this.topicChannel = {
      [Websocket.Topic.BALANCE_UPDATES]: Gate.Websocket.Channel.DEFAULT,
      [Websocket.Topic.DEPTH_FULL]: Gate.Websocket.Channel.DEFAULT,
      [Websocket.Topic.DEPTH_LIGHT]: Gate.Websocket.Channel.DEFAULT,
    };

    this.topicAuthentication = {
      [Websocket.Topic.BALANCE_UPDATES]: Websocket.Auth.PER_MESSAGE,
      [Websocket.Topic.DEPTH_FULL]: Websocket.Auth.NONE,
      [Websocket.Topic.DEPTH_LIGHT]: Websocket.Auth.NONE,
    };

    this.channelAuthentication = {
      [Gate.Websocket.Channel.DEFAULT]: Websocket.Auth.NONE,
    };

    this.channelPresubscription = {
      [Gate.Websocket.Channel.DEFAULT]: [],
    };
  }

  public async getWebsocketUrl(channel: Gate.Websocket.Channel): Promise<string> {
    if (channel === Gate.Websocket.Channel.DEFAULT) return Gate.Constant.DEFAULT_WEBSOCKET_URL;

    throw new Error('Unknown channel');
  }

  public getMessageContext(
    data: Gate.Websocket.Messages[keyof Gate.Websocket.Messages],
  ): Websocket.MessageContext<Gate.Websocket.Topic> {
    const possibleTypes: (Websocket.Action | Websocket.Topic)[] = [];
    let success: boolean = false;
    let requestId: string | undefined;
    let topic: Gate.Websocket.Topic | undefined;
    let subjects: string[] | undefined;
    let error: string | undefined;

    if (data.event === 'subscribe') {
      possibleTypes.push(Websocket.Action.SUBSCRIBE);
      success = !data.error;
      requestId = data.id.toString();
      error = data.error?.message;
    }
    if (data.event === 'unsubscribe') {
      possibleTypes.push(Websocket.Action.UNSUBSCRIBE);
      success = !data.error;
      requestId = data.id.toString();
      error = data.error?.message;
    }
    if (data.event === 'update') {
      if (data.channel === Gate.Websocket.Topic.DEPTH_FULL) {
        possibleTypes.push(Websocket.Topic.DEPTH_FULL);
        success = true;
        topic = data.channel;
        subjects = [data.result.s];
      }
      if (data.channel === Gate.Websocket.Topic.DEPTH_LIGHT) {
        possibleTypes.push(Websocket.Topic.DEPTH_LIGHT);
        success = true;
        topic = data.channel;
        subjects = [data.result.s];
      }
      if (data.channel === Gate.Websocket.Topic.BALANCE_UPDATES) {
        possibleTypes.push(Websocket.Topic.BALANCE_UPDATES);
        success = true;
        topic = data.channel;
      }
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
  }): Promise<Websocket.MessagePayloads<Gate.Websocket.Payloads[Websocket.Action.SUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Gate.Websocket.Payloads[Websocket.Action.SUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      const requestId = this.generateRequestId();
      payloads.push({
        requestId: requestId.toString(),
        type: Websocket.Action.SUBSCRIBE,
        message: {
          id: requestId,
          channel: stream.innerTopic,
          event: 'subscribe',
          payload: this.getChannelPayload(stream.topic, stream.innerSubject),
          time: Math.floor(Date.now() / 1000),
        },
        streams: [stream],
      });
    }

    return payloads;
  }

  public async getUnsubscribePayloads(props: {
    streams: Websocket.Stream[];
  }): Promise<Websocket.MessagePayloads<Gate.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]>> {
    const { streams } = props;

    const payloads: Websocket.MessagePayloads<Gate.Websocket.Payloads[Websocket.Action.UNSUBSCRIBE]> = [];
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      const requestId = this.generateRequestId();
      payloads.push({
        requestId: requestId.toString(),
        type: Websocket.Action.UNSUBSCRIBE,
        message: {
          id: requestId,
          channel: stream.innerTopic,
          event: 'unsubscribe',
          payload: this.getChannelPayload(stream.topic, stream.innerSubject),
          time: Math.floor(Date.now() / 1000),
        },
        streams: [stream],
      });
    }

    return payloads;
  }

  public getPingPayload(): Promise<Gate.Websocket.Payloads[Websocket.Action.PING]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public getPongPayload(): Promise<Gate.Websocket.Payloads[Websocket.Action.PONG]> {
    throw Error("Trying to get payload, while it's not implemented");
  }

  public isPingMessage?: (
    websocket: WebsocketClass<
      Gate.Websocket.Payloads[Websocket.Action.PING],
      Gate.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Gate.Websocket.Messages[keyof Gate.Websocket.Messages],
  ) => boolean;

  public isPongMessage?: (
    websocket: WebsocketClass<
      Gate.Websocket.Payloads[Websocket.Action.PING],
      Gate.Websocket.Payloads[Websocket.Action.PONG]
    >,
    message: Gate.Websocket.Messages[keyof Gate.Websocket.Messages],
  ) => boolean;

  private generateRequestId() {
    return Math.round((Math.random() * 100 * Date.now()) / (Math.random() * 1000));
  }

  private getChannelPayload<TUnifiedTopic extends keyof Websocket.Streams.UTopicSubject>(
    ...args: Websocket.Streams.FunctionArgs<TUnifiedTopic>
  ): string[] | undefined {
    const [topic, subject] = args;

    if (topic === Websocket.Topic.DEPTH_FULL) {
      if (!subject) throw new Error('Subject is required for depth full');
      return [subject, Gate.Constant.DEPTH_UPDATE_INTERVAL];
    }
    if (topic === Websocket.Topic.DEPTH_LIGHT) {
      if (!subject) throw new Error('Subject is required for depth light');
      return [subject, Gate.Constant.DEPTH_LEVEL, Gate.Constant.DEPTH_UPDATE_INTERVAL];
    }
    if (topic === Websocket.Topic.BALANCE_UPDATES) {
      return undefined;
    }
    return undefined;
  }
}
