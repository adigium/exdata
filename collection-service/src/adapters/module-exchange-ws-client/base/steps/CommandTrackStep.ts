import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type Input = {
  action: Websocket.Action.SUBSCRIBE | Websocket.Action.UNSUBSCRIBE;
  streams: Websocket.Stream[];
  streamsDistribution: {
    connection: Websocket.Connection;
    streams: Websocket.Stream[];
    payloads: Websocket.MessagePayloads<any>;
  }[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

type Output = Input;

export class CommandTrackStep extends WebsocketStep<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const { action, streamsDistribution } = input;

    for (const chunk of streamsDistribution) {
      for (let i = 0; i < chunk.payloads.length; i++) {
        const payload = chunk.payloads[i];

        this.websocket.requestManager.addRequest({
          id: payload.requestId,
          data: payload.message,
          type: payload.type,
          websocketId: chunk.connection.id,
        });

        if (action === Websocket.Action.SUBSCRIBE) {
          this.websocket.streamManager.addStreams(
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
                unsubscribeId: payload.requestId,
                unsubscribeRequestedAt: Date.now(),
              },
            }));

          this.websocket.streamManager.updateStreams(updatedWsStreams);
        }
      }
    }

    return input;
  }
}
