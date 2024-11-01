import { createHmac } from 'crypto';
import { v4 as uuid } from 'uuid';
import { OneMessageStrategy } from '../../../base';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../../../interfaces';
import { Websocket } from '../../../types';
import { Poloniex } from '../definitions';

export class PoloniexOneMessageStrategy
  extends OneMessageStrategy<
    Poloniex.Websocket.Payloads,
    Poloniex.Websocket.Messages,
    Poloniex.Websocket.Topic,
    Poloniex.Websocket.Channel
  >
  implements WebsocketScoped
{
  constructor(
    public websocket: WebsocketScope,
    public exchange: ExchangeScope,
    public application: ApplicationScope,
  ) {
    super(websocket.specification);
  }

  public async getAuthPayload(): Promise<
    Websocket.MessagePayload<Poloniex.Websocket.Payloads[Websocket.Action.AUTH]>
  > {
    const signTimestamp = Date.now();
    const method = 'GET';
    const path = '/ws';
    const queryParams = `signTimestamp=${signTimestamp}`;

    const requestString = `${method}\n${path}\n${queryParams}`;

    const signature = createHmac('sha256', this.application.configuration.POLONIEX_API_SECRET)
      .update(requestString)
      .digest('base64');

    return {
      streams: [],
      type: Websocket.Action.AUTH,
      requestId: uuid(),
      message: {
        event: 'subscribe',
        channel: ['auth'],
        params: {
          key: this.application.configuration.POLONIEX_API_KEY,
          signTimestamp,
          signature,
          signatureMethod: 'HmacSHA256',
          signatureVersion: '2',
        },
      },
    };
  }
}
