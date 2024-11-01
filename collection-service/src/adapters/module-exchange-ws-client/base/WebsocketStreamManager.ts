import { Websocket } from '../types';
import { WebsocketManager } from './WebsocketManager';

export class WebsocketStreamManager<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> {
  private websocketStreams: Map<string, Websocket.ConnectionStream>;
  private websocketManager: WebsocketManager<TPayloads, TMessages, TInnerTopic, TChannel>;

  constructor(input: { websocketManager: WebsocketManager<TPayloads, TMessages, TInnerTopic, TChannel> }) {
    this.websocketStreams = new Map<string, Websocket.ConnectionStream>();

    this.websocketManager = input.websocketManager;
  }

  public getStreams() {
    return this.websocketStreams;
  }

  public getStream(streamId: string) {
    return this.websocketStreams.get(streamId);
  }

  public addStreams(wsStreams: Websocket.ConnectionStream[]) {
    for (const wsStream of wsStreams) {
      if (this.websocketStreams.has(wsStream.stream.id)) {
        throw new Error('Stream with this subject and topic already exists');
      }

      this.websocketStreams.set(wsStream.stream.id, wsStream);

      const websocket = this.websocketManager.getConnection(wsStream.websocketId);
      if (websocket) websocket.streamCount += 1;
    }
  }

  public updateStreams(wsStreams: Websocket.ConnectionStream[]) {
    for (const wsStream of wsStreams) {
      this.websocketStreams.set(wsStream.stream.id, wsStream);
    }
  }

  public confirmStreams(wsStreams: Websocket.ConnectionStream[]) {
    for (const wsStream of wsStreams) {
      const prevWsStream = this.websocketStreams.get(wsStream.id) || wsStream;

      if (!prevWsStream.requests) continue;

      this.websocketStreams.set(wsStream.id, {
        ...prevWsStream,
        requests: {
          ...prevWsStream.requests,
          subscribedAt: Date.now(),
        },
      });
    }
  }

  public removeStreams(wsStreams: Websocket.ConnectionStream[]) {
    for (const wsStream of wsStreams) {
      this.websocketStreams.delete(wsStream.id);

      const websocket = this.websocketManager.getConnection(wsStream.websocketId);
      if (websocket) websocket.streamCount -= 1;
    }
  }

  public clearStreams(websocketId: string) {
    for (const [wsStreamId, wsStream] of this.websocketStreams) {
      if (wsStream.websocketId === websocketId) {
        this.websocketStreams.delete(wsStreamId);
      }
    }
  }

  public getStreamIdentifier(topic: string, subject?: string): string {
    return subject ? `${topic.toLowerCase()}@${subject.toLowerCase()}` : topic.toLowerCase();
  }

  public getRequestStreams(request: Websocket.Request) {
    const relatedStreams = Array.from(this.websocketStreams.values()).filter(
      (wsStream) =>
        (request.type === Websocket.Action.SUBSCRIBE && wsStream.requests?.subscribeId === request.id) ||
        (request.type === Websocket.Action.UNSUBSCRIBE && wsStream.requests?.unsubscribeId === request.id),
    );
    return relatedStreams;
  }
}
