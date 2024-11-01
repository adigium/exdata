import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { Websocket } from '../../types';
import { WebsocketSpecification } from '../WebsocketSpecification';

export abstract class OneMessageStrategy<
  TPayloads extends Websocket.Exchange.Action,
  TMessages extends Websocket.Exchange.Message,
  TInnerTopic extends string,
  TChannel extends string,
> {
  constructor(private specification: WebsocketSpecification<TPayloads, TMessages, TInnerTopic, TChannel>) {}

  public async authenticate(websocket: WebsocketClass<any, any>): Promise<boolean> {
    const payload = await this.getAuthPayload(websocket);

    const authenticationPromise = new Promise<boolean>((resolve) => {
      websocket.addListener(WebsocketClass.MESSAGE, (_, event) => {
        let data: any = event.data;

        try {
          if (typeof data === 'string') {
            data = JSON.parse(data);
          } else if (data instanceof Buffer || data instanceof ArrayBuffer) {
            data = JSON.parse(new TextDecoder('utf-8').decode(data));
          } else {
            return;
          }
        } catch (e: any) {
          throw Error(`Failed to parse websocket message`);
        }

        const message = this.specification.getMessageContext(data);

        const isAuthMessage = message.possibleMessageTypes.includes(Websocket.Action.AUTH);

        if (
          (message.requestId && message.requestId === payload.requestId && isAuthMessage) ||
          (!message.requestId && isAuthMessage)
        ) {
          resolve(message.success);
        }
      });
    });

    await websocket.send(payload.message);

    return Promise.race([
      authenticationPromise,
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), Websocket.Constants.AUTHENTICATION_TIMEOUT);
      }),
    ]);
  }

  public abstract getAuthPayload(
    websocket: WebsocketClass<TPayloads[Websocket.Action.PING], TPayloads[Websocket.Action.PONG]>,
  ): Promise<Websocket.MessagePayload<TPayloads[Websocket.Action.AUTH]>>;
}
