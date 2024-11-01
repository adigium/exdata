import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { Websocket } from '../../types';

export abstract class ConnectionStringStrategy<TChannel extends string> {
  public async authenticate(websocketId: string, channel: TChannel, url: string): Promise<string> {
    const authenticationString = await this.getAuthenticationString(websocketId, channel);

    return url.replace(Websocket.Constants.AUTH_PLACEHOLDER, authenticationString);
  }

  public abstract getAuthenticationString(websocketId: string, channel: TChannel): Promise<string>;

  public abstract handleConnectionOpened?: (websocket: WebsocketClass<any, any>) => Promise<void>;
  public abstract handleConnectionClosed?: (websocket: WebsocketClass<any, any>) => Promise<void>;
}
