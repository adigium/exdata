import { createHmac } from 'crypto';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { PerMessageStrategy } from '../../../base';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../../../interfaces';
import { Websocket } from '../../../types';
import { Gate } from '../definitions';

export class GatePerMessageStrategy
  extends PerMessageStrategy<Gate.Websocket.Payloads>
  implements WebsocketScoped
{
  constructor(
    public websocket: WebsocketScope,
    public exchange: ExchangeScope,
    public application: ApplicationScope,
  ) {
    super();
  }

  public async authenticate<T extends Websocket.Action>(
    _: WebsocketClass<
      Gate.Websocket.Payloads[Websocket.Action.PING],
      Gate.Websocket.Payloads[Websocket.Action.PONG]
    >,
    payload: Gate.Websocket.Payloads[T],
  ) {
    payload.auth = this.generateSignature(payload);
    return payload;
  }

  private generateSignature<T extends Websocket.Action>(
    payload: Gate.Websocket.Payloads[T],
  ): Gate.Websocket.Payloads[T]['auth'] {
    const message = `channel=${payload.channel}&event=${payload.event}&time=${payload.time}`;

    const sign = createHmac('sha512', this.application.configuration.GATE_API_SECRET)
      .update(message)
      .digest('hex');

    return {
      method: 'api_key',
      KEY: this.application.configuration.GATE_API_KEY,
      SIGN: sign,
    };
  }
}
