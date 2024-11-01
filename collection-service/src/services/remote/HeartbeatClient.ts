import { inject, injectable } from 'inversify';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

type HeartbeatRequest = {
  instanceId: string;
};

@injectable()
export class HeartbeatClient {
  private logger: LoggerModule;

  private heartbeatHost: string;
  private heartbeatPort: number | string | undefined;
  private heartbeatEndpoint: string;

  private tls: boolean;

  constructor(
    @inject(DI.HttpClientModule) private httpClient: HttpClientModule,
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
  ) {
    this.heartbeatHost = this.configuration.HEARTBEAT_HOST;
    this.heartbeatPort = this.configuration.HEARTBEAT_PORT;
    this.heartbeatEndpoint = this.configuration.HEARTBEAT_ENDPOINT;

    this.tls = this.configuration.TLS_ENABLED === 'true';

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'HearbeatClient');
  }

  public async sendHeartbeat(instanceId: string): Promise<boolean> {
    try {
      const { status } = await this.httpClient.post<HeartbeatRequest, undefined>({
        url: this.getEndpointUrl(this.heartbeatEndpoint),
        body: {
          instanceId,
        },
      });

      return status === 204;
    } catch (error: any) {
      return false;
    }
  }

  private getEndpointUrl(endpoint: string) {
    return endpoint.startsWith('/') ? `${this.getBaseUrl()}${endpoint}` : `${this.getBaseUrl()}/${endpoint}`;
  }

  private getBaseUrl() {
    return `${this.tls ? 'https' : 'http'}://${this.heartbeatHost}${this.heartbeatPort ? `:${this.heartbeatPort}` : ''}`;
  }
}
