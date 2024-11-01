import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
} from '@adapters/module-exchange-ws-client/interfaces';
import { Websocket } from '../../types';
import { WebsocketAuthentication } from '../auth';
import { WebsocketStep } from './WebsocketStep';

export type PayloadInput = {
  action: Websocket.Action.SUBSCRIBE | Websocket.Action.UNSUBSCRIBE;
  streams: Websocket.Stream[];
  streamsDistribution: { connection: Websocket.Connection; streams: Websocket.Stream[] }[];
  presubscriptionEvents: Websocket.MessageEvent[];
};

type PayloadOutput = {
  streamsDistribution: {
    connection: Websocket.Connection;
    streams: Websocket.Stream[];
    payloads: Websocket.MessagePayloads<any>;
  }[];
} & PayloadInput;

export class CommandPayloadStep extends WebsocketStep<PayloadInput, PayloadOutput> {
  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
    private authentication: WebsocketAuthentication<any, any, any, any>,
  ) {
    super(application, exchange, websocket);
  }

  async execute(input: PayloadInput): Promise<PayloadOutput> {
    const { action, streamsDistribution } = input;

    let getPayloads:
      | ((input: Pick<PayloadInput, 'streams'>) => Promise<Websocket.MessagePayloads<any>>)
      | undefined;

    switch (action) {
      case Websocket.Action.SUBSCRIBE:
        getPayloads = this.websocket.specification.getSubscribePayloads;
        break;
      case Websocket.Action.UNSUBSCRIBE:
        getPayloads = this.websocket.specification.getUnsubscribePayloads;
        break;
      default:
        getPayloads = undefined;
        break;
    }

    if (!getPayloads) throw new Error(`Failed to get payload for the action: ${action}`);

    const result: PayloadOutput['streamsDistribution'] = [];

    for (const streamsChunk of streamsDistribution) {
      const payloads = await getPayloads.call(this.websocket.specification, {
        streams: streamsChunk.streams,
      });

      payloads.forEach((payload) => {
        const { message, streams } = payload;

        const doesRequireAuthentication = streams.reduce(
          (acc, stream) =>
            acc ||
            this.websocket.specification.topicAuthentication[stream.topic] === Websocket.Auth.PER_MESSAGE,
          false,
        );

        if (doesRequireAuthentication) {
          const authenticator = this.authentication[Websocket.Auth.PER_MESSAGE];
          if (!authenticator) throw new Error('Authenticator not found');

          payload.message = authenticator.authenticate(streamsChunk.connection.websocket, message);
        }
      });

      result.push({
        ...streamsChunk,
        payloads,
      });
    }

    return { ...input, streamsDistribution: result };
  }
}
