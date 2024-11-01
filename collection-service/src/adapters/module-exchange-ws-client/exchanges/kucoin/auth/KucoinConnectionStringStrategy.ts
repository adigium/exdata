import { ExchangeID } from '@entities';
import { RateLimiterModule } from '@modules';
import { KucoinApiClient } from '@adapters/module-exchange-client';
import { ConnectionStringStrategy } from '@adapters/module-exchange-ws-client/base';
import { Websocket as WebsocketClass } from '@frameworks/websocket';
import { ConfigurationService } from '@services/core';
import { Websocket } from '../../../types';
import { Kucoin } from '../definitions';

type BulletResponse = {
  code: string;
  data: {
    token: string;
    instanceServers: {
      endpoint: string;
      protocol: string;
      encrypt: boolean;
      pingInterval: number;
      pingTimeout: number;
    }[];
  };
};

export class KucoinConnectionStringStrategy extends ConnectionStringStrategy<Kucoin.Websocket.Channel> {
  private websocketBulletResponse: Map<string, BulletResponse>;

  constructor(
    private exchangeId: ExchangeID,
    private configuration: ConfigurationService,
    private rateLimiter: RateLimiterModule,
    private exchangeClient: KucoinApiClient<ExchangeRequestContext.Kucoin>,
  ) {
    super();

    this.websocketBulletResponse = new Map();
  }

  public async authenticate(
    websocketId: string,
    channel: Kucoin.Websocket.Channel,
    url: string,
  ): Promise<string> {
    let bulletResponse = this.websocketBulletResponse.get(websocketId);

    if (!bulletResponse) {
      bulletResponse = await this.makeBulletRequest();
      this.websocketBulletResponse.set(websocketId, bulletResponse);
    }

    if (channel === Kucoin.Websocket.Channel.PRIVATE) {
      return url.replace(
        Websocket.Constants.AUTH_PLACEHOLDER,
        `${bulletResponse.data.instanceServers[0].endpoint}?token=${bulletResponse.data.token}`,
      );
    }
    if (channel === Kucoin.Websocket.Channel.PUBLIC) {
      return url.replace(
        Websocket.Constants.AUTH_PLACEHOLDER,
        bulletResponse.data.instanceServers[0].endpoint,
      );
    }

    throw new Error('Invalid channel');
  }

  public async getAuthenticationString(websocketId: string): Promise<string> {
    let bulletResponse = this.websocketBulletResponse.get(websocketId);

    if (!bulletResponse) {
      bulletResponse = await this.makeBulletRequest();
      this.websocketBulletResponse.set(websocketId, bulletResponse);
    }

    return bulletResponse.data.instanceServers[0].endpoint;
  }

  public async makeBulletRequest(): Promise<BulletResponse> {
    const bulletPrivateRequestDetails = {
      endpoint: `/api/v1/bullet-private`,
      weight: 10,
      id: this.configuration.KUCOIN_UID,
      ip: this.configuration.PUBLIC_IP,
      type: 'spot',
    } as const;

    await this.rateLimiter.waitForLimit(
      await this.rateLimiter.getLimitInfo(this.exchangeId, bulletPrivateRequestDetails),
    );
    await this.rateLimiter.addUsage(this.exchangeId, bulletPrivateRequestDetails);

    const bulletResponse: BulletResponse = await this.exchangeClient.ccxtClient?.privatePostBulletPrivate();

    if (bulletResponse.code !== '200000') {
      throw new Error('Failed to construct websocket URL due to authorization error');
    }

    const serverInstance = bulletResponse.data.instanceServers[0];

    if (!serverInstance) {
      throw new Error('Failed to consturct websocket URL due to the absence of server instance in response');
    }

    return bulletResponse;
  }

  public handleConnectionOpened?: ((websocket: WebsocketClass<any, any>) => Promise<void>) | undefined;
  public handleConnectionClosed?: ((websocket: WebsocketClass<any, any>) => Promise<void>) | undefined;
}
