import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type Input = {
  websocketId: string;
  message: any;
};

type Output = Input & {
  context: Websocket.MessageContext<any>;
  relatedRequests: Websocket.Request[];
};

export class MessageContextStep extends WebsocketStep<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const context = this.websocket.specification.getMessageContext(input.message);

    const { possibleMessageTypes: possibleTypes, requestId, subjects, topic } = context;

    const isRequestRelatedMessage =
      possibleTypes.includes(Websocket.Action.UNSUBSCRIBE) ||
      possibleTypes.includes(Websocket.Action.SUBSCRIBE) ||
      possibleTypes.includes(Websocket.Action.PING) ||
      possibleTypes.includes(Websocket.Action.PONG);

    const relatedRequests: Websocket.Request[] = [];

    if (isRequestRelatedMessage) {
      const requests = this.collectRequests(requestId, subjects, topic);

      requests.forEach((requestId) => {
        const request = this.websocket.requestManager.getRequest(requestId);
        if (request) relatedRequests.push(request);
      });
    }

    return { context, relatedRequests, ...input };
  }

  private collectRequests(requestId?: string, subjects?: string[], topic?: string): Set<string> {
    const requests = new Set<string>();

    if (requestId) requests.add(requestId);

    if (!subjects && topic) {
      const streamIdentifier = this.websocket.streamManager.getStreamIdentifier(topic);
      const wsStream = this.websocket.streamManager.getStream(streamIdentifier);
      if (wsStream) {
        if (wsStream.requests?.subscribeId) requests.add(wsStream.requests.subscribeId);
        if (wsStream.requests?.unsubscribeId) requests.add(wsStream.requests.unsubscribeId);
      }
    }

    if (subjects && topic)
      subjects.forEach((subject) => {
        const streamIdentifier = this.websocket.streamManager.getStreamIdentifier(topic, subject);
        const wsStream = this.websocket.streamManager.getStream(streamIdentifier);
        if (wsStream) {
          if (wsStream.requests?.subscribeId) requests.add(wsStream.requests.subscribeId);
          if (wsStream.requests?.unsubscribeId) requests.add(wsStream.requests.unsubscribeId);
        }
      });

    return requests;
  }
}
