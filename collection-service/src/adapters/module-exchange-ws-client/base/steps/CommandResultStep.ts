import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type ResultInput = {
  action: Websocket.Action.SUBSCRIBE | Websocket.Action.UNSUBSCRIBE;
  streams: Websocket.Stream[];
  streamsDistribution: {
    connection: Websocket.Connection;
    streams: Websocket.Stream[];
    payloads: Websocket.MessagePayloads<any>;
    errors: (Error | null)[];
  }[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

type ResultOutput = {
  succeeded: Websocket.Stream[];
  failed: Websocket.Stream[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

export class CommandResultStep extends WebsocketStep<ResultInput, ResultOutput> {
  async execute(input: ResultInput): Promise<ResultOutput> {
    const { action, streamsDistribution, presubscriptionEvents } = input;

    const succeeded: Websocket.Stream[] = [];
    const failed: Websocket.Stream[] = [];

    for (const chunk of streamsDistribution) {
      for (let i = 0; i < chunk.payloads.length; i++) {
        const payload = chunk.payloads[i];
        const error = chunk.errors[i];

        if (!error) {
          succeeded.push(...payload.streams);
          continue;
        }

        failed.push(...payload.streams);

        this.websocket.requestManager.removeRequest(payload.requestId);

        if (action === Websocket.Action.SUBSCRIBE) {
          this.websocket.streamManager.removeStreams(
            payload.streams.map((stream) => ({
              id: stream.id,
              websocketId: chunk.connection.id,
              requests: {
                subscribeId: payload.requestId,
                subscribeRequestedAt: Date.now(),
              },
              stream,
            })),
          );
        }
        if (action === Websocket.Action.UNSUBSCRIBE) {
          const updatedWsStreams = payload.streams
            .filter(
              (stream) =>
                !!this.websocket.streamManager.getStream(stream.id) &&
                !!this.websocket.streamManager.getStream(stream.id)!.requests,
            )
            .map((stream) => ({
              ...this.websocket.streamManager.getStream(stream.id)!,
              requests: {
                ...this.websocket.streamManager.getStream(stream.id)!.requests!,
                unsubscribeId: undefined,
                unsubscribeRequestedAt: undefined,
              },
            }));

          this.websocket.streamManager.updateStreams(updatedWsStreams);
        }
      }
    }

    return { succeeded, failed, presubscriptionEvents };
  }
}
