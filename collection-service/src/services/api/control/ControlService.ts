import { inject, injectable } from 'inversify';
import { ExchangeID, TaskControlMessage } from '@entities';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { OrchestrationService } from '@services/core';
import { RegistryService } from '@services/remote';

@injectable()
export class ControlService {
  private logger: LoggerModule;

  @inject(DI.OrchestrationService)
  private orchestrationService!: OrchestrationService;

  @inject(DI.RegistryService)
  private registryService!: RegistryService;

  constructor() {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskControlService');
  }

  public async handleTaskControl(task: TaskControlMessage) {
    if (task.instanceId !== this.registryService.getInstanceId()) return;

    for (const exchange of task.exchanges) {
      if (!Object.values(ExchangeID).includes(exchange as ExchangeID)) return;

      if (task.opCode === 'start') {
        await this.orchestrationService.registerServiceTask(exchange as ExchangeID, task.taskType);
      }
      if (task.opCode === 'stop') {
        await this.orchestrationService.deregisterServiceTask(exchange as ExchangeID, task.taskType);
      }
    }
  }
}
