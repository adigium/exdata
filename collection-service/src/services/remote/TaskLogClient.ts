import { inject, injectable } from 'inversify';
import { TaskLogMessage } from '@entities';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

@injectable()
export class TaskLogClient {
  private logger: LoggerModule;

  private taskLogEndpoint: string;
  private taskLogHost: string;
  private taskLogPort: number | string | undefined;
  private tls: boolean;

  constructor(
    @inject(DI.HttpClientModule) private httpClient: HttpClientModule,
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskLogClient');

    this.taskLogEndpoint = this.configuration.TASK_LOG_ENDPOINT;
    this.taskLogHost = this.configuration.CONTROLLER_HOST;
    this.taskLogPort = this.configuration.CONTROLLER_PORT;
    this.tls = this.configuration.TLS_ENABLED === 'true';
  }

  public async sendTaskLog(task: TaskLogMessage) {
    try {
      const { status } = await this.httpClient.post({
        url: this.getEndpointUrl(this.taskLogEndpoint, this.taskLogHost, this.taskLogPort),
        body: task,
      });

      return status === 204;
    } catch (e: any) {
      return false;
    }
  }

  private getEndpointUrl(endpoint: string, host: string, port?: number | string | undefined) {
    return endpoint.startsWith('/')
      ? `${this.getBaseUrl(host, port)}${endpoint}`
      : `${this.getBaseUrl(host, port)}/${endpoint}`;
  }

  private getBaseUrl(host: string, port?: number | string | undefined) {
    return `${this.tls ? 'https' : 'http'}://${host}${port ? `:${port}` : ''}`;
  }
}
