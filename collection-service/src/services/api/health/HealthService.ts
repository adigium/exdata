import { inject, injectable } from 'inversify';
import { DatabaseRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';

@injectable()
export class HealthService {
  private logger: LoggerModule;

  @inject(DI.DatabaseRepository)
  private database!: DatabaseRepository;

  constructor() {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'HealthService');
  }

  public async checkHealthy(): Promise<boolean> {
    const { data: isHealthy } = await this.database.isHealthy();
    return !!isHealthy;
  }
}
