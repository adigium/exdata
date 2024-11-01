import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { Websocket } from '../../types';

export abstract class PerMessageStrategy<TPayloads extends Websocket.Exchange.Action> {
  public abstract authenticate<T extends keyof TPayloads>(
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
    payload: TPayloads[T],
  ): Promise<TPayloads[T]>;
}
