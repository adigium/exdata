import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type MessageInput = {
  action: Websocket.Action.SUBSCRIBE | Websocket.Action.UNSUBSCRIBE;
  streams: Websocket.Stream[];
  streamsDistribution: {
    connection: Websocket.Connection;
    streams: Websocket.Stream[];
    payloads: Websocket.MessagePayloads<any>;
  }[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

type MessageOutput = {
  streamsDistribution: {
    connection: Websocket.Connection;
    streams: Websocket.Stream[];
    payloads: Websocket.MessagePayloads<any>;
    errors: (Error | null)[];
  }[];
} & MessageInput;

export class CommandMessageStep extends WebsocketStep<MessageInput, MessageOutput> {
  async execute(input: MessageInput): Promise<MessageOutput> {
    const { streamsDistribution } = input;

    const result: MessageOutput['streamsDistribution'] = [];

    for (const chunk of streamsDistribution) {
      const sendingErrors: (any | null)[] = [];
      for (const payload of chunk.payloads) {
        let error: any | null = null;

        try {
          if (!chunk.connection.isAuthenticated) {
            throw new Error(
              `Connection is not authenticated as required by it's channel type: ${chunk.connection.channel}`,
            );
          }

          await this.websocket.connectionManager.sendMessage({
            websocketId: chunk.connection.id,
            message: payload.message,
          });
        } catch (e: any) {
          error = e;
        } finally {
          sendingErrors.push(error);
        }
      }

      result.push({
        ...chunk,
        errors: sendingErrors,
      });
    }

    return { ...input, streamsDistribution: result };
  }
}
