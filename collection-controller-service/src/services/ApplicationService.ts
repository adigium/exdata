import bodyParser from 'body-parser';
import Express, { Application as ExpressApplication } from 'express';
import { CollectorServiceInstance } from '@entities';
import { DatabaseRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { InstanceHealthService } from './InstanceHealthService';
import { InstanceRegistryService } from './InstanceRegistryService';
import { TaskControlService } from './TaskControlService';
import { TaskLogService } from './TaskLogService';
import { TaskRedistributionService } from './TaskRedistributionService';

export class ApplicationService {
  private app: ExpressApplication;
  private appPort: number;

  private taskRedistributionService: TaskRedistributionService;
  private taskControlService: TaskControlService;
  private taskLogService: TaskLogService;

  private instanceHealthService: InstanceHealthService;
  private instanceRegistryService: InstanceRegistryService;

  private database: DatabaseRepository;
  private logger: LoggerModule;

  private registerEndpoint: string;
  private deregisterEndpoint: string;
  private heartbeatEndpoint: string;

  constructor(input: {
    DI: {
      database: DatabaseRepository;
      taskRedistributionService: TaskRedistributionService;
      taskControlService: TaskControlService;
      taskLogService: TaskLogService;
      instanceRegistryService: InstanceRegistryService;
      instanceHealthService: InstanceHealthService;
    };
    registerEndpoint: string;
    deregisterEndpoint: string;
    heartbeatEndpoint: string;
    httpPort: number;
  }) {
    const { DI, registerEndpoint, deregisterEndpoint, heartbeatEndpoint, httpPort } = input;

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'Application');

    this.app = Express();
    this.app.use(bodyParser.json());
    this.appPort = httpPort;

    this.instanceRegistryService = DI.instanceRegistryService;
    this.taskRedistributionService = DI.taskRedistributionService;
    this.taskControlService = DI.taskControlService;
    this.taskLogService = DI.taskLogService;
    this.instanceHealthService = DI.instanceHealthService;
    this.database = DI.database;

    this.registerEndpoint = registerEndpoint;
    this.deregisterEndpoint = deregisterEndpoint;
    this.heartbeatEndpoint = heartbeatEndpoint;

    this.taskLogService.on('task-log-received', async () => {
      await this.taskRedistributionService.redistributeTasks();
    });

    this.taskRedistributionService.on('redistribution-done', async (taskControls) => {
      for (const taskControl of taskControls) {
        const { success } = await this.database.createTaskControlMessage(taskControl);

        if (!success) {
          this.logger.error(
            `Failed saving task control message: ${taskControl.instanceId.slice(0, 4)}:${taskControl.opCode}:${taskControl.taskType}:${taskControl.exchanges}`,
          );
          continue;
        }

        const taskControlSent = await this.taskControlService.sendTaskControl(taskControl);

        // TODO: If message was not sent delete the task from the database collector instance record
        this.logger.info(
          `Redistribution messsage sent: ${taskControl.instanceId.slice(0, 4)}:${taskControl.opCode}:${taskControl.taskType}:${taskControl.exchanges} => ${taskControlSent}`,
        );
      }
    });
  }

  public async start() {
    await this.database.connect();

    this.logger.info('Connected to the database');

    this.instanceHealthService.start();

    this.logger.info('Started health check service');

    this.applyRegistryRoutes();
    this.taskLogService.apply(this.app);

    this.app.listen(this.appPort, () => {
      this.logger.info('Started HTTP server');
    });

    setInterval(async () => {
      this.logger.info('Scheduled redistribution started');

      await this.taskRedistributionService.redistributeTasks();

      this.logger.info('Scheduled redistribution succedeed');
    }, 10000);
  }

  // TODO: Refactor
  private applyRegistryRoutes() {
    this.app.post(this.getEndpointUrl(this.registerEndpoint), async (req, res) => {
      try {
        const data: Omit<CollectorServiceInstance, 'id' | 'isHealthy' | 'lastHeartbeat'> = req.body;

        this.logger.info(`Request on registering a new instance: ${data}`);

        if (!data?.host) {
          res.status(400).json({ error: 'Host should be provided for instance registration' });
          return;
        }

        const instanceId = await this.instanceRegistryService.registerInstance({
          host: data.host,
          isHealthy: true,
          lastHealthcheck: Date.now(),
          lastHeartbeat: Date.now(),
        });

        if (!instanceId) {
          this.logger.error(`Failed to register instance on ${this.registerEndpoint} request`);

          res.status(500).json({ error: 'Failed to register instance' });
          return;
        }

        this.logger.info(`Successfully registered a new instance: ${instanceId}`);

        this.taskRedistributionService.redistributeTasks();

        res.status(201).json({ instanceId });
      } catch (error: any) {
        this.logger.error(`Failed to register instance on ${this.registerEndpoint} request`);
        res.status(500).json({ error: 'Failed to register instance' });
      }
    });

    this.app.post(this.getEndpointUrl(this.deregisterEndpoint), async (req, res) => {
      try {
        const data: Pick<CollectorServiceInstance, 'id'> = req.body;

        if (!data.id) {
          res.status(400).json({ error: 'Instance ID should be provided for instance deregistration' });
          return;
        }

        const isDeregistered = await this.instanceRegistryService.deregisterInstance(data.id);

        if (!isDeregistered) {
          this.logger.error('Failed to deregister instance on /deregister request');

          res
            .status(500)
            .json({ id: data.id, success: isDeregistered, error: 'Failed to deregister instance' });
          return;
        }

        this.logger.info(`Successfully deregistered the instance: ${data.id}`);

        this.taskRedistributionService.redistributeTasks();

        res.status(204).json({ id: data.id, success: isDeregistered });
      } catch (error: any) {
        this.logger.error('Failed to deregister instance on /deregister request');
        res.status(500).json({ error: 'Failed to deregister instance' });
      }
    });

    this.app.post(this.getEndpointUrl(this.heartbeatEndpoint), async (req, res) => {
      try {
        const instanceId: string | undefined = req.body.instanceId;

        if (!instanceId) {
          res.status(400).json({ error: 'Instance ID should be provided for instance heartbeat' });
          return;
        }

        const isHearbeated = await this.instanceRegistryService.receiveHeartbeat(instanceId);

        if (!isHearbeated) {
          this.logger.error('Failed to heartbeat instance on /heartbeat request');

          res.status(500).json({ instanceId, success: isHearbeated, error: 'Failed to heartbeat instance' });
          return;
        }

        res.status(204).json({ instanceId, success: isHearbeated });
      } catch (error: any) {
        this.logger.error(`Failed to process heartbeat from instance: ${error.message}`);
        res.status(500).json({ error: 'Failed to process heartbeat from instance' });
      }
    });
  }

  private getEndpointUrl(endpoint: string) {
    return endpoint.startsWith('/') ? `${endpoint}` : `/${endpoint}`;
  }
}
