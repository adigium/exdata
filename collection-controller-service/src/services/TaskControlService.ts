import { TaskControlMessage } from '@entities';
import { DatabaseRepository } from '@repositories';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

export class TaskControlService {
  private database: DatabaseRepository;
  private httpClient: HttpClientModule;
  private logger: LoggerModule;

  private taskControlEndpoint: string;
  private taskControlPort: number | string | undefined;
  private tls: boolean;

  // TODO: Move out to config
  private retries: number = 10;
  private retryInterval: number = 1000;

  constructor(input: {
    DI: { database: DatabaseRepository; httpClient: HttpClientModule };
    taskControlEndpoint: string;
    taskControlPort: number | string | undefined;
    tls: boolean;
  }) {
    const { DI, taskControlEndpoint, taskControlPort, tls } = input;

    this.database = DI.database;
    this.httpClient = DI.httpClient;
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskControlService');

    this.taskControlEndpoint = taskControlEndpoint;
    this.taskControlPort = taskControlPort;
    this.tls = tls;
  }

  public async sendTaskControl(task: TaskControlMessage) {
    try {
      await this.withRetries(this._sendTaskControl.bind(this, task), this.retries, this.retryInterval);
    } catch (error: any) {
      this.logger.error(`Failed to send task control message with retries: ${error.message}`);
      return false;
    }
  }

  private async _sendTaskControl(task: TaskControlMessage) {
    const { data: instance } = await this.database.getCollectorServiceInstance(task.instanceId);

    if (!instance) {
      this.logger.error(
        `Trying to send task control message to the instance which is not present in registry`,
      );
      return false;
    }

    try {
      const { status } = await this.httpClient.post({
        url: this.getEndpointUrl(this.taskControlEndpoint, instance.host, this.taskControlPort),
        body: task,
      });

      return status === 200;
    } catch (e: any) {
      throw new Error(`Failed to send task control message: ${e.message}`);
    }
  }

  private async withRetries<T, R>(
    func: (...args: T[]) => Promise<R>,
    retryCount: number = 1,
    retryInterval: number = 1000,
  ): Promise<R> {
    const runFunc = async (attempt: number): Promise<R> => {
      try {
        return await func();
      } catch (error: any) {
        if (attempt >= retryCount) throw new Error(`Failed to execute with retries: ${error.message}`);
        await new Promise((resolve) => {
          setTimeout(resolve, retryInterval);
        });
        return await runFunc(attempt + 1);
      }
    };

    return runFunc(1);
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
