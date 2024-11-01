import { Router } from 'express';
import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { HealthService } from './HealthService';

@injectable()
export class HealthController {
  private router: Router;
  private logger: LoggerModule;

  @inject(DI.ApiHealthService)
  private HealthService!: HealthService;

  constructor() {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'HealthController');

    this.router = Router();
    this.setupRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private setupRoutes() {
    this.getHealthStatus();
  }

  private getHealthStatus = () =>
    this.router.get('/health', async (req, res) => {
      const isHealthy = await this.HealthService.checkHealthy();

      if (isHealthy) res.status(200).send({ status: 'healthy' });
      else res.status(500).send({ status: 'unhealty' });
    });
}
