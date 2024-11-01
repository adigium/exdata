import { inject, injectable } from 'inversify';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

type RegisterRequest = {
  host: string;
};

type RegisterResponse = {
  instanceId: string;
};

type DeregisterRequest = {
  id: string;
};

type DeregisterResponse = never;

@injectable()
export class RegistryClient {
  private instanceId: string | undefined;

  private registryHost: string;
  private registryPort: number | string | undefined;

  private registerEndpoint: string;
  private deregisterEndpoint: string;

  private instanceHost: string;

  private tls: boolean;

  private logger: LoggerModule;

  constructor(
    @inject(DI.HttpClientModule) private httpClient: HttpClientModule,
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'RegistryClient');

    this.registryHost = this.configuration.REGISTRY_HOST;
    this.registryPort = this.configuration.REGISTRY_PORT;

    this.instanceHost = this.configuration.INSTANCE_HOST;

    this.registerEndpoint = this.configuration.REGISTER_ENDPOINT;
    this.deregisterEndpoint = this.configuration.DEREGISTER_ENDPOINT;

    this.tls = this.configuration.TLS_ENABLED === 'true';
  }

  public async register() {
    this.logger.info(`Trying to register instance at: ${this.getEndpointUrl(this.registerEndpoint)}`);

    const { data, status } = await this.httpClient.post<RegisterRequest, RegisterResponse>({
      url: this.getEndpointUrl(this.registerEndpoint),
      body: {
        host: this.instanceHost,
      },
    });

    this.logger.info(`Trying to register instance: Response: ${status} -> ${data.instanceId}`);

    if (status === 201 && data.instanceId) return data.instanceId;

    throw new Error(`Failed to register with CTC with status: ${status}`);
  }

  public async deregister() {
    if (!this.instanceId) return;

    const { status } = await this.httpClient.post<DeregisterRequest, DeregisterResponse>({
      url: this.getEndpointUrl(this.deregisterEndpoint),
      body: {
        id: this.instanceId,
      },
    });

    if (status === 204) {
      this.logger.info(`Deregistered with CTC, assigned instanceId: ${this.instanceId}`);
      return;
    }

    throw new Error(`Failed to deregister with CTC with status: ${status}`);
  }

  private getEndpointUrl(endpoint: string) {
    return endpoint.startsWith('/') ? `${this.getBaseUrl()}${endpoint}` : `${this.getBaseUrl()}/${endpoint}`;
  }

  private getBaseUrl() {
    return `${this.tls ? 'https' : 'http'}://${this.registryHost}${this.registryPort ? `:${this.registryPort}` : ''}`;
  }
}
