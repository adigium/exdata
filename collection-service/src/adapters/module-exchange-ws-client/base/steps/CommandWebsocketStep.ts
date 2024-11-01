import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
} from '@adapters/module-exchange-ws-client/interfaces';
import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type Input = {
  action: Websocket.Action.SUBSCRIBE | Websocket.Action.UNSUBSCRIBE;
  streams: Websocket.Stream[];
};

type Output = Input & {
  streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

export class CommandWebsocketStep extends WebsocketStep<Input, Output> {
  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
    private streamsPerWebsocket?: number,
  ) {
    super(application, exchange, websocket);
  }

  async execute(input: Input): Promise<Output> {
    const streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[] = [];

    const subscribeDistribution = await this.handleSubscribeAction(input);
    const unsubscribeDistribution = await this.handleUnsubscribeAction(input);

    streamsDistribution.push(...subscribeDistribution, ...unsubscribeDistribution);

    const presubscriptionEvents: Websocket.MessageEvent[] = this.getPresubscribedEvents(
      input,
      streamsDistribution,
    );

    return { ...input, streamsDistribution, presubscriptionEvents };
  }

  private async handleSubscribeAction(input: Input) {
    const { streams, action } = input;
    const streamsLimit = this.streamsPerWebsocket || Infinity;
    const streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[] = [];

    if (action !== Websocket.Action.SUBSCRIBE) return streamsDistribution;

    const streamsByChannelType = new Map<string, Websocket.Stream[]>();
    for (const stream of streams) {
      const channelType = this.websocket.specification.topicChannel[stream.topic];
      if (!streamsByChannelType.has(channelType)) {
        streamsByChannelType.set(channelType, []);
      }
      streamsByChannelType.get(channelType)!.push(stream);
    }

    for (const channelStreams of streamsByChannelType) {
      const [channelType, requiredStreams] = channelStreams;
      let requiredCapacityLeft = requiredStreams.length;
      let currentIndex = 0;

      for (const [, connection] of this.websocket.connectionManager.getConnections()) {
        if (connection.channel !== channelType) continue;

        const capacity = streamsLimit - connection.streamCount;
        if (capacity > 0) {
          const nextIndex = currentIndex + capacity;
          const start = currentIndex;
          const end = Math.min(nextIndex, requiredStreams.length);

          streamsDistribution.push({
            connection,
            streams: requiredStreams.slice(start, end),
          });
          currentIndex = end;
        }
        requiredCapacityLeft -= capacity;
      }

      while (requiredCapacityLeft > 0) {
        const connection = await this.websocket.connectionManager.createConnection(channelType);
        const capacity = streamsLimit - connection.streamCount;

        if (capacity > 0) {
          const nextIndex = currentIndex + capacity;
          const start = currentIndex;
          const end = Math.min(nextIndex, requiredStreams.length);

          streamsDistribution.push({
            connection,
            streams: requiredStreams.slice(start, end),
          });
          currentIndex = end;
        }
        requiredCapacityLeft -= capacity;
      }
    }

    return streamsDistribution;
  }

  private async handleUnsubscribeAction(input: Input) {
    const { streams, action } = input;
    const streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[] = [];

    if (action !== Websocket.Action.UNSUBSCRIBE) return streamsDistribution;

    const websocketStreams = this.websocket.streamManager.getStreams();

    const websocketStreamsMapped = streams.map((stream) => websocketStreams.get(stream.id)).filter(Boolean);

    const websocketConnectionMap = new Map<
      string,
      { connection: Websocket.Connection; streams: Websocket.Stream[] }
    >();

    websocketStreamsMapped.forEach((wsStream) => {
      if (!wsStream) return;

      const websocketConnection = websocketConnectionMap.get(wsStream.websocketId);

      if (!websocketConnection) {
        const connection = this.websocket.connectionManager.getConnection(wsStream.websocketId);
        if (!connection) return;

        websocketConnectionMap.set(wsStream.websocketId, { connection, streams: [wsStream.stream] });
        return;
      }

      websocketConnection.streams = [...websocketConnection.streams, wsStream.stream];
    });

    return websocketConnectionMap.values();
  }

  private getPresubscribedEvents(
    input: Input,
    streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[],
  ) {
    const { action } = input;

    const presubscriptionEvents: Websocket.MessageEvent[] = [];

    if (action === Websocket.Action.UNSUBSCRIBE) return presubscriptionEvents;

    for (const chunk of streamsDistribution) {
      const { connection } = chunk;

      if (!connection.websocket.isOpen()) continue;

      const presubscribedTopics = this.websocket.specification.channelPresubscription[connection.channel];

      if (!presubscribedTopics || presubscribedTopics.length === 0) continue;

      const streams: Websocket.Stream[] = presubscribedTopics.map((topic) => ({
        id: this.websocket.streamManager.getStreamIdentifier(topic),
        topic,
        innerTopic: this.websocket.specification.topicMap[topic],
        innerSubject: undefined,
      }));

      const presubscribedTopicMap: Map<Websocket.Topic, Websocket.MessageEvent> = new Map();

      // FIXME: Handle unsubscription case seprately, since we can unsubscribe only by closing connection

      streams.forEach((stream) => {
        if (presubscribedTopicMap.has(stream.topic)) return;

        this.websocket.streamManager.addStreams([
          {
            id: stream.id,
            websocketId: connection.id,
            stream,
          },
        ]);

        presubscribedTopicMap.set(stream.topic, {
          event: Websocket.Event.SUBSCRIBE,
          topicUnified: stream.topic,
          data: {
            subjects: [],
            success: true,
            topic: stream.topic,
          },
        });
      });

      presubscriptionEvents.push(...presubscribedTopicMap.values());

      input.streams = input.streams.filter((stream) => !presubscribedTopicMap.has(stream.topic));
      chunk.streams = chunk.streams.filter((stream) => !presubscribedTopicMap.has(stream.topic));
    }

    return presubscriptionEvents;
  }
}
