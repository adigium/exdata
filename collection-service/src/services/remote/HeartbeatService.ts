import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { HeartbeatClient } from './HeartbeatClient';

@injectable()
export class HeartbeatService {
  private logger: LoggerModule;

  private heartbeatProcess: NodeJS.Timeout | undefined;
  private heartbeatInterval: number;
  private retryInterval: number;

  constructor(
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
    @inject(DI.HeartbeatClient) private heartbeatClient: HeartbeatClient,
  ) {
    this.heartbeatInterval = +this.configuration.HEARTBEAT_INTERVAL;
    this.retryInterval = +this.configuration.HEARTBEAT_RETRY_INTERVAL;

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'HeartbeatService');
  }

  public async start(instanceId: string) {
    const send = async () => {
      const isRunning = !!this.heartbeatProcess;

      if (isRunning) {
        const isSuccess = await this.heartbeatClient.sendHeartbeat(instanceId);

        if (isSuccess) {
          // this.logger.info(`Successfully sent heartbeat message`);
          setTimeout(send, this.heartbeatInterval);
        } else if (!isSuccess) {
          this.logger.error(`Failed to sent heartbeat message, retrying after: ${this.retryInterval}`);
          setTimeout(send, this.retryInterval);
        }
      }
    };

    this.heartbeatProcess = setTimeout(send, 0);
  }

  public async stop() {
    const process = this.heartbeatProcess;

    if (process) clearTimeout(process);

    this.heartbeatProcess = undefined;
  }
}
