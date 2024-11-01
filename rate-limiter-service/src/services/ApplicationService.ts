import bodyParser from 'body-parser';
import Express, { Application as ExpressApplication } from 'express';
import { inject, injectable } from 'inversify';
import { ExchangeID } from '@entities';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from './ConfigurationService';
import { RateLimiterProvider } from './RateLimiterProvider';

@injectable()
export class ApplicationService {
  private app: ExpressApplication;
  private appPort: number;

  private logger: LoggerModule;

  @inject(DI.RateLimiterProvider)
  private rateLimiterProvider!: RateLimiterProvider;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'Application');

    this.app = Express();
    this.app.use(bodyParser.json());
    this.appPort = +this.configuration.HTTP_PORT;

    process.on('SIGTERM', async () => {
      process.exit(0);
    });
    process.on('SIGINT', async () => {
      process.exit(0);
    });
  }

  public async start() {
    this.applyRoutes();

    this.app.listen(this.appPort, () => {
      this.logger.info('Started HTTP server');
    });
  }

  private applyRoutes() {
    this.app.post<{ exchangeId: ExchangeID }, {}, { request: RequestDetails<any> }>(
      '/:exchangeId/limit',
      async (req, res) => {
        try {
          const { exchangeId } = req.params;
          const { request } = req.body;

          if (!Object.values(ExchangeID).includes(exchangeId)) {
            res.status(400).send();
            return;
          }

          const rateLimiter = this.rateLimiterProvider.get(exchangeId);

          if (!rateLimiter) {
            res.status(400).send();
            return;
          }

          const data = {
            exceeds: await rateLimiter.exceedsLimits(request),
            retryTime: await rateLimiter.getRetryTime(request),
          };

          res.status(200).json(data);
        } catch (e: any) {
          this.logger.error(`Error POST /:exchangeId/limit: ${e.message}`);
          res.status(500).send();
        }
      },
    );

    this.app.put<
      { exchangeId: ExchangeID },
      {},
      { request: RequestDetails<any>; limits: Record<string, number> }
    >('/:exchangeId/limit', async (req, res) => {
      try {
        const { exchangeId } = req.params;
        const { request, limits } = req.body;

        if (!Object.values(ExchangeID).includes(exchangeId)) {
          res.status(400).send();
          return;
        }

        const rateLimiter = this.rateLimiterProvider.get(exchangeId);

        if (!rateLimiter) {
          res.status(400).send();
          return;
        }

        await rateLimiter.updateLimits(request, limits);

        res.status(200).send();
      } catch (e: any) {
        this.logger.error(`Error PUT /:exchangeId/limit: ${e.message}`);
        res.status(500).send();
      }
    });

    this.app.post<{ exchangeId: ExchangeID }, {}, { request: RequestDetails<any> }>(
      '/:exchangeId/usage',
      async (req, res) => {
        try {
          const { exchangeId } = req.params;
          const { request } = req.body;

          if (!Object.values(ExchangeID).includes(exchangeId)) {
            res.status(400).send();
            return;
          }

          const rateLimiter = this.rateLimiterProvider.get(exchangeId);

          if (!rateLimiter) {
            res.status(400).send();
            return;
          }

          await rateLimiter.addUsage(request);

          const data = {
            exceeds: await rateLimiter.exceedsLimits(request),
            retryTime: await rateLimiter.getRetryTime(request),
          };

          res.status(200).json(data);
        } catch (e: any) {
          this.logger.error(`Error POST /:exchangeId/usage: ${e.message}`);
          res.status(500).send();
        }
      },
    );
  }
}
