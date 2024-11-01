import { Router } from 'express';
import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ControlService } from './ControlService';

@injectable()
export class ControlController {
  private router: Router;
  private logger: LoggerModule;

  @inject(DI.ApiControlService)
  private taskControlService!: ControlService;

  constructor() {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskControlController');

    this.router = Router();
    this.setupRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private setupRoutes() {
    this.postTaskControl();
  }

  private postTaskControl = () =>
    this.router.post('/control', async (req, res) => {
      const task = req.body;

      this.logger.info(`Task control message received: ${task.taskType}:${task.opCode}:${task.exchanges}`);

      await this.taskControlService.handleTaskControl(task);

      res.status(200).send();
    });
}
