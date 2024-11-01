import { createHmac } from 'crypto';
import { v4 as uuid } from 'uuid';
import { OneMessageStrategy } from '../../../base';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../../../interfaces';
import { Websocket } from '../../../types';
import { Bybit } from '../definitions';

export class BybitOneMessageStrategy
  extends OneMessageStrategy<
    Bybit.Websocket.Payloads,
    Bybit.Websocket.Messages,
    Bybit.Websocket.Topic,
    Bybit.Websocket.Channel
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
    Websocket.MessagePayload<Bybit.Websocket.Payloads[Websocket.Action.AUTH]>
  > {
    const requestId = uuid();

    const args = this.getAuthArgs(
      this.application.configuration.BYBIT_API_KEY,
      this.application.configuration.BYBIT_API_SECRET,
    );

    return {
      streams: [],
      type: Websocket.Action.AUTH,
      requestId,
      message: {
        args,
        op: 'auth',
        req_id: requestId,
      },
    };
  }

  private getAuthArgs(
    apiKey: string,
    apiSecret: string,
  ): Bybit.Websocket.Payloads[Websocket.Action.AUTH]['args'] {
    const timestamp = new Date().getTime();
    const expires = timestamp + Bybit.Constant.AUTH_MESSAGE_EXPIRATION_MS;

    const preHash = `GET/realtime${expires}`;

    const signature = createHmac('sha256', apiSecret).update(preHash).digest('hex');

    return [apiKey, expires, signature];
  }
}
