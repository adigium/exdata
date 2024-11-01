import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

const REQUEST_RESPONSE_MAP: Record<Websocket.Action, Websocket.Action | undefined> = {
  [Websocket.Action.AUTH]: Websocket.Action.AUTH,
  [Websocket.Action.SUBSCRIBE]: Websocket.Action.SUBSCRIBE,
  [Websocket.Action.UNSUBSCRIBE]: Websocket.Action.UNSUBSCRIBE,
  [Websocket.Action.PING]: undefined,
  [Websocket.Action.PONG]: Websocket.Action.PING,
};

type Input = {
  websocketId: string;
  message: any;
  context: Websocket.MessageContext<any>;
  relatedRequests: Websocket.Request[];
};

type Output = Input & {
  relatedEvents: Websocket.MessageAction[];
};

export class MessageRequestStep extends WebsocketStep<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const { websocketId, relatedRequests, context } = input;

    const relatedEvents: Websocket.MessageAction[] = [];

    for (const request of relatedRequests) {
      const event = this.completeRequest({
        websocketId,
        request,
        context,
      });
      relatedEvents.push(event);
    }

    return { ...input, relatedEvents };
  }

  private completeRequest(props: {
    websocketId: string;
    request: Websocket.Request;
    context: Websocket.MessageContext<any>;
  }): Websocket.MessageAction {
    const { websocketId, request, context } = props;

    const possiblePayloadTypes = context.possibleMessageTypes
      .map((responseType) => REQUEST_RESPONSE_MAP[responseType])
      .filter(Boolean);

    if (request.websocketId !== websocketId) {
      throw new Error(
        `Trying to complete request, which is related to another websocket, needs investigation: ${JSON.stringify(request, null, 2)}`,
      );
    }
    if (!possiblePayloadTypes.includes(request.type)) {
      throw new Error(
        `Request type ${request.type} is not expected in possible types: ${JSON.stringify(possiblePayloadTypes, null, 2)}`,
      );
    }

    if (request.type === Websocket.Action.PING || request.type === Websocket.Action.PONG) {
      this.websocket.requestManager.removeRequest(request.id);
      return {
        action: request.type,
        success: context.success,
        error: context.error,
      };
    }

    const streams = this.websocket.streamManager.getRequestStreams(request);
    const topicInner = streams[0]?.stream.innerTopic;

    if (context.success && !topicInner) {
      throw new Error(
        `Unable to determine topic for the request: ${JSON.stringify(request, null, 2)} (related streams: ${JSON.stringify(streams, null, 2)})`,
      );
    }

    const event: any = {
      subjects: streams.map((wsStream) => wsStream.stream.innerSubject),
      topic: this.getTopicType(topicInner),
      success: context.success,
      error: context.error,
    };

    if (request.type === Websocket.Action.SUBSCRIBE) {
      if (context.success) this.websocket.streamManager.confirmStreams(streams);
      if (!context.success) this.websocket.streamManager.removeStreams(streams);
      event.action = request.type;
    }
    if (request.type === Websocket.Action.UNSUBSCRIBE) {
      if (context.success) this.websocket.streamManager.removeStreams(streams);
      event.action = request.type;
    }

    this.websocket.requestManager.removeRequest(request.id);
    return event;
  }

  private getTopicType(innerTopic: string): Websocket.Topic {
    const topicMap = this.websocket.specification.topicMap;

    const reversedTopicMap = Object.fromEntries(
      Object.entries(topicMap).map(([key, value]) => [value, key as Websocket.Topic]),
    );

    if (!reversedTopicMap[innerTopic]) throw new Error(`Unknown topic: ${innerTopic}`);

    return reversedTopicMap[innerTopic];
  }
}
