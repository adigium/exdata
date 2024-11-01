import { Application, Request, Response, Router } from 'express';
import { Emitter } from 'strict-event-emitter';
import { TaskLogMessage } from '@entities';
import { DatabaseRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

export class TaskLogService extends Emitter<{ ['task-log-received']: [task: TaskLogMessage] }> {
  private router: Router;

  private database: DatabaseRepository;
  private logger: LoggerModule;

  constructor(input: { DI: { database: DatabaseRepository }; taskLogEndpoint: string }) {
    super();

    const { DI, taskLogEndpoint } = input;

    this.database = DI.database;
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'TaskLogService');

    this.router = Router();
    this.router.post(taskLogEndpoint, this.handleTaskLog.bind(this));
  }

  public apply(app: Application) {
    app.use(this.router);
  }

  // TODO: Add validation
  private async handleTaskLog(req: Request<{}, {}, TaskLogMessage>, res: Response) {
    const task = req.body;

    const { success: isTaskLogSaved, error: taskLogSaveError } =
      await this.database.createTaskLogMessage(task);

    if (!isTaskLogSaved) {
      this.logger.error(
        `Cannot save task log message: ${task.instanceId} -> ${task.exchange}/${task.task} (${task.status})\n${taskLogSaveError.message}`,
      );
    }

    const {
      success: collectorInstanceSuccess,
      data: collectorService,
      error: collectorServiceError,
    } = await this.database.getCollectorServiceInstance(task.instanceId);

    if (collectorInstanceSuccess && !collectorService && !collectorServiceError) {
      this.logger.error(
        `Received update for task ${task.exchange}/${task.task} (${task.status}) for instance, which is not in the database: ${task.instanceId}`,
      );
      res.status(403).send();
      return;
    }

    if (!collectorInstanceSuccess || !collectorService || collectorServiceError) {
      this.logger.error(`Failed to fetch collector service instance: ${collectorServiceError}`);
      return;
    }

    const serviceTask = collectorService.tasks?.find(
      (sTask) => sTask.exchange === task.exchange && sTask.task === task.task,
    );

    if (serviceTask === undefined || !collectorService.tasks) {
      this.logger.error(
        `Received update for instance, which does not have that task registered in the storage ${task.instanceId} -> ${task.exchange}/${task.task} (${task.status})`,
      );
      res.status(500).send();
      return;
    }

    const udpatedTask = {
      ...serviceTask,
      lastStatus: task.status,
      lastUpdatedAt: Date.now(),
    };

    const isSaved = await this.database.updateCollectorServiceInstance(task.instanceId, {
      ...collectorService,
      tasks: [...collectorService.tasks.filter((task) => task.id !== serviceTask.id), udpatedTask],
    });

    if (!isSaved) {
      this.logger.error(
        `Cannot update the storage for the following task: ${task.instanceId} -> ${task.exchange}/${task.task} (${task.status})`,
      );
      res.status(500).send();
      return;
    }

    this.emit('task-log-received', task);

    res.status(204).send();
  }
}
