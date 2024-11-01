import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';
import { HeartbeatService } from './HeartbeatService';
import { RegistryClient } from './RegistryClient';

@injectable()
export class RegistryService {
  private instanceId: string | undefined;

  private retries: number;
  private retryInterval: number;

  private logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
    @inject(DI.HeartbeatService) private heartbeatService: HeartbeatService,
    @inject(DI.RegistryClient) private registryClient: RegistryClient,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'RegistryService');

    this.retries = +this.configuration.REGISTRY_RETRIES;
    this.retryInterval = +this.configuration.REGISTRY_RETRY_INTERVAL;
  }

  public async register() {
    try {
      this.instanceId = await this.withRetries(
        this.registryClient.register.bind(this.registryClient),
        this.retries,
        this.retryInterval,
      );

      this.handleRegistered();
    } catch (error: any) {
      this.logger.error(`Failed to register with retries: ${error.message}`);
      process.kill(process.pid, 'SIGINT');
    }
  }

  public async deregister() {
    try {
      await this.withRetries(
        this.registryClient.deregister.bind(this.registryClient),
        this.retries,
        this.retryInterval,
      );

      this.handleDeregistered();
    } catch (error: any) {
      this.logger.error(`Failed to deregister with retries: ${error.message}`);
    }
  }

  public getInstanceId() {
    return this.instanceId;
  }

  private async handleRegistered() {
    if (!this.instanceId) throw new Error('Instance was not registered');

    await this.heartbeatService.start(this.instanceId);
  }

  private async handleDeregistered() {
    await this.heartbeatService.stop();
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
}
