import { inject, injectable } from 'inversify';
import { TaskLogMessage } from '@entities';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { RegistryService } from './RegistryService';
import { TaskLogClient } from './TaskLogClient';

@injectable()
export class TaskLogService {
  private logger: LoggerModule;

  @inject(DI.TaskLogClient)
  private taskLogClient!: TaskLogClient;

  @inject(DI.RegistryService)
  private registryService!: RegistryService;

  constructor() {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskLogService');
  }

  public async sendTaskLog(task: Omit<TaskLogMessage, 'instanceId'>) {
    try {
      const instanceId = this.registryService.getInstanceId();
      if (!instanceId) throw new Error('Instance is not registered');

      return await this.taskLogClient.sendTaskLog({ ...task, instanceId });
    } catch (e: any) {
      return false;
    }
  }
}
