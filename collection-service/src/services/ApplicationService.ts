import bodyParser from 'body-parser';
import Express, { Application as ExpressApplication } from 'express';
import { Server } from 'http';
import { inject, injectable } from 'inversify';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ControlController, HealthController } from './api';
import { ConfigurationService, OrchestrationService } from './core';
import { CmcService, HeartbeatService, RegistryService } from './remote';

enum State {
  CREATED = 'created',
  INITIALIZED = 'initialized',
  STARTED = 'started',
  STOPPED = 'stopped',
  TERMINATED = 'terminated',
}

@injectable()
export class ApplicationService {
  private state: State = State.CREATED;

  private app: ExpressApplication;
  private appPort: number;
  private server?: Server;

  @inject(DI.CmcService)
  private cmcService!: CmcService;

  @inject(DI.OrchestrationService)
  private orchestrationService!: OrchestrationService;

  @inject(DI.HeartbeatService)
  private heartbeatService!: HeartbeatService;

  @inject(DI.DatabaseRepository)
  private database!: DatabaseRepository;

  private logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
    @inject(DI.SettingsRepository)
    private settings: SettingsRepository,
    @inject(DI.ApiHealthController)
    private healthController: HealthController,
    @inject(DI.ApiControlController)
    private controlController: ControlController,
    @inject(DI.RegistryService)
    private registryService: RegistryService,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'Application');

    this.app = Express();
    this.app.use(bodyParser.json());
    this.appPort = +this.configuration.INSTANCE_HTTP_PORT;

    this.app.use(this.healthController.getRouter());
    this.app.use(this.controlController.getRouter());

    process.on('SIGTERM', async () => {
      await this.terminate();
      process.exit(0);
    });
    process.on('SIGINT', async () => {
      await this.terminate();
      process.exit(0);
    });
  }

  public async start() {
    if (this.state === State.STARTED) return;
    if (this.state === State.CREATED || this.state === State.TERMINATED) await this.initialize();

    this.logger.info(`Starting the service...`);

    const { isCollectionEnabled } = await this.settings.current();

    if (!isCollectionEnabled) {
      this.logger.info('Collection is disabled in settings...');
      return;
    }

    await this.cmcService.updateRanking();
    this.logger.info('Updated assets ranks');

    await this.registryService.register();
    this.logger.info(`Registered instance at CTC service: ${this.registryService.getInstanceId()}`);

    this.state = State.STARTED;
  }

  public async stop() {
    if (this.state === State.CREATED) return;
    if (this.state === State.STOPPED) return;
    if (this.state === State.TERMINATED) return;

    this.logger.info('Stopping the service...');

    await this.orchestrationService.deregesterServices();
    this.logger.info('Deregistered all the exchange services');

    await this.heartbeatService.stop();
    this.logger.info('Stopped hearbeat service');

    await this.registryService.deregister();
    this.logger.info('Stopped successfully!');

    this.state = State.STOPPED;
  }

  public async initialize() {
    if (this.state === State.INITIALIZED || this.state === State.STARTED || this.state === State.STOPPED)
      return;

    await this.database.connect();

    await this.settings.initialize();
    this.settings.watch();

    this.settings.on('on-change', ({ changes }) => {
      this.logger.info(`Settings changed: ${JSON.stringify(changes, null, 2)}`, ['Settings']);
      if (changes.isCollectionEnabled !== undefined) {
        if (changes.isCollectionEnabled) this.start();
        else if (!changes.isCollectionEnabled) this.stop();
      }
      if (changes.assetsRankThreshold !== undefined) {
        this.cmcService.updateRanking();
      }
    });

    this.server = this.app.listen(this.appPort, () => this.logger.info('Started HTTP server'));

    this.logger.info(`Initialized...`);
    this.state = State.INITIALIZED;
  }

  public async terminate() {
    if (this.state === State.CREATED) return;
    if (this.state === State.TERMINATED) return;
    if (this.state === State.STARTED) await this.stop();

    this.server?.closeAllConnections();
    this.server?.close();

    this.settings.unwatch();

    await this.database.disconnect();

    this.logger.info(`Terminated...`);
    this.state = State.TERMINATED;
  }
}
