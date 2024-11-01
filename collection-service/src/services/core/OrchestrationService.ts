import { inject, injectable, interfaces } from 'inversify';
import { Emitter } from 'strict-event-emitter';
import { ExchangeID, TaskLogMessage, TaskType } from '@entities';
import { ExchangeServiceModule, LoggerModule } from '@modules';
import { color, colors, ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { TaskLogService } from '@services/remote';

type Events = {
  'register-service': [name: string, tasks?: TaskType[]];
  'deregister-service': [name: string];
  'register-task': [name: string, task: TaskType];
  'deregister-task': [name: string, task: TaskType];
  'start-execution': [name: string];
  'stop-execution': [name: string];
  'task-done': [task: Omit<TaskLogMessage, 'instanceId'>];
};

@injectable()
export class OrchestrationService extends Emitter<Events> {
  private logger: LoggerModule;

  private tasks: TaskType[];

  private exchangeServices: Map<string, ExchangeServiceModule>;

  @inject(DI.ExchangeFactoryService)
  private exchangeServiceFactory!: interfaces.AutoNamedFactory<ExchangeServiceModule>;

  @inject(DI.TaskLogService)
  private taskLogService!: TaskLogService;

  constructor() {
    super();

    this.tasks = [];

    this.logger = new Logger(new ConsoleLoggerStrategy(), this.constructor.name);

    this.exchangeServices = new Map<string, ExchangeServiceModule>();
  }

  async registerService(exchangeId: ExchangeID, tasks?: TaskType[]) {
    const exchangeService = this.getExchangeServiceInstance(exchangeId);

    this.exchangeServices.set(exchangeService.getId(), exchangeService);

    await this.startService(exchangeService, tasks);

    this.logger.info(`Exchange service registered: ${exchangeService.getId()}`);

    this.emit('register-service', exchangeService.getId());
  }

  async deregisterService(name: string) {
    await this.stopService(name);
    this.exchangeServices.delete(name);

    this.logger.info(`Exchange service deregistered: ${name}`);

    this.emit('deregister-service', name);
  }

  async deregesterServices() {
    for (const service of this.exchangeServices.values()) {
      await service.stop();
    }

    this.exchangeServices.clear();
  }

  registerTask(task: TaskType) {
    this.exchangeServices.forEach(async (service, name) => {
      await service.registerTask(task);

      this.emit('register-task', name, task);
    });
  }

  async registerServiceTask(exchangeId: ExchangeID, task: TaskType) {
    let exchangeService = this.exchangeServices.get(exchangeId);

    this.logger.info(
      `Registering service task: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
    );

    if (!exchangeService) {
      this.logger.info(
        `No service initialized was found for: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
      );

      await this.registerService(exchangeId);
      exchangeService = this.getExchangeServiceInstance(exchangeId);
    }

    await exchangeService.registerTask(task);

    this.logger.info(
      `Successfully registered service task: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
    );

    this.emit('register-task', exchangeId, task);
  }

  deregisterTask(task: TaskType) {
    this.exchangeServices.forEach(async (service, name) => {
      await service.deregisterTask(task);

      this.emit('deregister-task', name, task);
    });
  }

  async deregisterServiceTask(exchangeId: ExchangeID, task: TaskType) {
    let exchangeService = this.exchangeServices.get(exchangeId);

    this.logger.info(
      `Deregistering service task: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
    );

    if (!exchangeService) {
      this.logger.info(
        `No service initialized was found for: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
      );

      await this.registerService(exchangeId);
      exchangeService = this.getExchangeServiceInstance(exchangeId);
    }

    await exchangeService.deregisterTask(task);

    this.logger.info(
      `Successfully deregistered service task: ${color(exchangeId, colors.yellow)}/${color(task, colors.blue)}`,
    );

    this.emit('deregister-task', exchangeId, task);
  }

  setServiceInterval(name: string, interval: number, task?: TaskType) {
    this.exchangeServices.get(name)?.setTaskInterval(interval, task);
  }

  deleteServiceInterval(name: string, task: TaskType) {
    this.exchangeServices.get(name)?.deleteTaskInterval(task);
  }

  private getExchangeServiceInstance(exchangeId: ExchangeID) {
    const instance = this.exchangeServices.get(exchangeId);

    if (instance) return instance;

    const newInstance = this.exchangeServiceFactory(exchangeId);

    this.exchangeServices.set(exchangeId, newInstance);

    return newInstance;
  }

  private async startService(service: ExchangeServiceModule, tasks?: TaskType[]) {
    await service.start();

    this.logger.debug(`Service started: ${service.getId()}`);

    await Promise.all((tasks || this.tasks).map((task) => service.registerTask(task)));

    service.on('task-done', async (task) => {
      const isSent = await this.taskLogService.sendTaskLog(task);

      if (!isSent) {
        this.logger.error(`Failed to send task log for: ${task.exchange}/${task.task} (${task.status})`);
      }
    });
  }

  private async stopService(name: string) {
    const service = this.exchangeServices.get(name);
    await service?.stop();
    this.emit('stop-execution', name);
  }
}
