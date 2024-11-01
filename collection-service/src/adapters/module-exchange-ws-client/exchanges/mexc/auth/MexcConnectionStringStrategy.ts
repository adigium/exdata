import { MexcApiClient } from '@adapters/module-exchange-client';
import { Websocket } from '@frameworks/websocket';
import { ConnectionStringStrategy } from '../../../base';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../../../interfaces';
import { Mexc } from '../definitions';

export class MexcConnectionStringStrategy
  extends ConnectionStringStrategy<Mexc.Websocket.Channel>
  implements WebsocketScoped
{
  private websocketListenKey: Map<string, string>;
  private websocketListenKeyInterval: Map<string, NodeJS.Timeout>;

  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
    private clientApi: MexcApiClient<ExchangeRequestContext.Mexc>,
  ) {
    super();

    this.websocketListenKey = new Map();
    this.websocketListenKeyInterval = new Map();
  }

  public async getAuthenticationString(websocketId: string): Promise<string> {
    let listenKey = this.websocketListenKey.get(websocketId);

    if (!listenKey) {
      listenKey = await this.createListenKey();
      this.websocketListenKey.set(websocketId, listenKey);
    }

    return listenKey;
  }

  public handleConnectionOpened = async (websocket: Websocket<any, any>) => {
    const listenKey = this.websocketListenKey.get(websocket.id);

    if (!listenKey) throw new Error('Found user data stream and no associated listen key');

    const interval = setInterval(() => {
      this.pingListenKey(listenKey);
    }, Mexc.Constant.LISTEN_KEY_PINGING_INTERVAL_MS);

    this.websocketListenKeyInterval.set(websocket.id, interval);
  };

  public handleConnectionClosed = async (websocket: Websocket<any, any>) => {
    const listenKey = this.websocketListenKey.get(websocket.id);
    const listenKeyInterval = this.websocketListenKeyInterval.get(websocket.id);

    if (listenKey) {
      this.closeListenKey(listenKey);
      this.websocketListenKey.delete(websocket.id);
    }
    if (listenKeyInterval) {
      clearInterval(listenKeyInterval);
      this.websocketListenKeyInterval.delete(websocket.id);
    }
  };

  private async createListenKey(): Promise<string> {
    const { configuration, rateLimiter } = this.application;
    const { id } = this.exchange;

    if (!this.clientApi.ccxtClient) throw new Error('Exchange API client is not initialized');

    const postUserDataStream: ExchangeRequestContext.Mexc = {
      endpoint: `/api/v3/userDataStream`,
      weight: 1,
      id: configuration.MEXC_UID,
      ip: configuration.PUBLIC_IP,
    };

    await rateLimiter.waitForLimit(await rateLimiter.getLimitInfo(id, postUserDataStream));
    await rateLimiter.addUsage(id, postUserDataStream);

    const {
      listenKey,
    }: {
      listenKey: string;
    } = await this.clientApi.ccxtClient.spotPrivatePostUserDataStream();

    return listenKey;
  }

  private async pingListenKey(listenKey: string): Promise<boolean> {
    const { configuration, rateLimiter } = this.application;
    const { id } = this.exchange;

    if (!this.clientApi.ccxtClient) throw new Error('Exchange API client is not initialized');

    const putUserDataStream: ExchangeRequestContext.Mexc = {
      endpoint: `/api/v3/userDataStream`,
      weight: 1,
      id: configuration.MEXC_UID,
      ip: configuration.PUBLIC_IP,
    };

    await rateLimiter.waitForLimit(await rateLimiter.getLimitInfo(id, putUserDataStream));
    await rateLimiter.addUsage(id, putUserDataStream);

    await this.clientApi.ccxtClient.spotPrivatePutUserDataStream({ listenKey });

    return true;
  }

  private async closeListenKey(listenKey: string): Promise<boolean> {
    const { configuration, rateLimiter } = this.application;
    const { id } = this.exchange;

    if (!this.clientApi.ccxtClient) throw new Error('Exchange API client is not initialized');

    const deleteUserDataStream: ExchangeRequestContext.Mexc = {
      endpoint: `/api/v3/userDataStream`,
      weight: 1,
      id: configuration.MEXC_UID,
      ip: configuration.PUBLIC_IP,
    };

    await rateLimiter.waitForLimit(await rateLimiter.getLimitInfo(id, deleteUserDataStream));
    await rateLimiter.addUsage(id, deleteUserDataStream);

    await this.clientApi.ccxtClient.spotPrivateDeleteUserDataStream({ listenKey });

    return true;
  }
}
