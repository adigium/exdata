import { CollectorServiceInstance } from '@entities';
import { DatabaseRepository } from '@repositories';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

export class InstanceHealthService {
  private logger: LoggerModule;
  private database: DatabaseRepository;
  private httpClient: HttpClientModule;

  private healthcheckInterval: number;
  private healthcheckProcess: NodeJS.Timeout | null;
  private healthcheckEndpoint: string;
  private healthcheckPort: number | string | undefined;
  private tls: boolean;

  constructor(input: {
    DI: { database: DatabaseRepository; httpClient: HttpClientModule };
    healthcheckEndpoint: string;
    healthcheckInterval: number;
    healthcheckPort: number | string | undefined;
    tls: boolean;
  }) {
    const { DI, healthcheckInterval, healthcheckEndpoint, healthcheckPort, tls } = input;

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'InstanceHealth');

    this.database = DI.database;
    this.httpClient = DI.httpClient;

    this.healthcheckEndpoint = healthcheckEndpoint;
    this.healthcheckInterval = healthcheckInterval;
    this.healthcheckPort = healthcheckPort;
    this.tls = tls;

    this.healthcheckProcess = null;
  }

  public start() {
    const check = (async () => {
      const { data: collectorInstances, error: collectorInstancesError } =
        await this.database.getCollectorServiceInstances();

      if (!collectorInstances) {
        this.logger.error(`Failed to fetch collector instances: ${collectorInstancesError}`);
        return;
      }

      for (const instance of collectorInstances) {
        const isHealthy = await this.checkHealthy(instance);

        const isUpdated = await this.database.updateCollectorServiceInstance(instance.id, {
          isHealthy,
          lastHealthcheck: Date.now(),
        });

        if (!isUpdated) {
          this.logger.error(
            `Failed to update instance health status: ${instance.id} - ${isHealthy ? 'healthy' : 'unhealthy'}`,
          );

          continue;
        }

        // this.logger.info(
        //   `Updated instance health status: ${instance.id} - ${isHealthy ? 'healthy' : 'unhealthy'}`,
        // );
      }

      if (this.healthcheckProcess) setTimeout(check, this.healthcheckInterval);
    }).bind(this);

    this.healthcheckProcess = setTimeout(check, 0);
  }

  public stop() {
    const process = this.healthcheckProcess;

    if (!process) return;

    clearTimeout(process);
    this.healthcheckProcess = null;
  }

  private async checkHealthy(instance: CollectorServiceInstance): Promise<boolean> {
    try {
      const { data, status } = await this.httpClient.get<{ status: 'healthy' | 'unhealthy' }>({
        url: this.getEndpointUrl(this.healthcheckEndpoint, instance.host, this.healthcheckPort),
      });

      if (data.status !== 'healthy' || status !== 200) return false;

      return true;
    } catch (e: any) {
      return false;
    }
  }

  private getEndpointUrl(endpoint: string, host: string, port?: number | string | undefined) {
    return endpoint.startsWith('/')
      ? `${this.getBaseUrl(host, port)}${endpoint}`
      : `${this.getBaseUrl(host, port)}/${endpoint}`;
  }

  private getBaseUrl(host: string, port?: number | string | undefined) {
    return `${this.tls ? 'https' : 'http'}://${host}${port ? `:${port}` : ''}`;
  }
}
