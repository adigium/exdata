export class ConfigurationService {
  private static instance?: ConfigurationService;

  readonly DATABASE_URI: string;

  readonly CONTROLLER_HTTP_PORT: string;
  readonly COLLECTOR_HTTP_PORT: string;
  readonly COLLECTOR_TASK_UPDATE_THRESHOLD: string;

  readonly HEALTHCHECK_INTERVAL: string;
  readonly HEALTHCHECK_THRESHOLD: string;
  readonly HEARTBEAT_THRESHOLD: string;
  readonly REDISTRIBUTION_FREQUENCY: string;

  readonly TASK_CONTROL_ENDPOINT: string;
  readonly TASK_LOG_ENDPOINT: string;
  readonly HEALTHCHECK_ENDPOINT: string;
  readonly HEARTBEAT_ENDPOINT: string;
  readonly REGISTER_ENDPOINT: string;
  readonly DEREGISTER_ENDPOINT: string;
  readonly TLS_ENABLED: string;

  private constructor() {
    this.DATABASE_URI = process.env.DATABASE_URI!;

    this.CONTROLLER_HTTP_PORT = process.env.CONTROLLER_HTTP_PORT!;
    this.COLLECTOR_HTTP_PORT = process.env.COLLECTOR_HTTP_PORT!;
    this.COLLECTOR_TASK_UPDATE_THRESHOLD = process.env.COLLECTOR_TASK_UPDATE_THRESHOLD!;

    this.HEALTHCHECK_INTERVAL = process.env.HEALTHCHECK_INTERVAL!;
    this.HEALTHCHECK_THRESHOLD = process.env.HEALTHCHECK_THRESHOLD!;
    this.HEARTBEAT_THRESHOLD = process.env.HEARTBEAT_THRESHOLD!;
    this.REDISTRIBUTION_FREQUENCY = process.env.REDISTRIBUTION_FREQUENCY!;

    this.TASK_CONTROL_ENDPOINT = process.env.TASK_CONTROL_ENDPOINT!;
    this.TASK_LOG_ENDPOINT = process.env.TASK_LOG_ENDPOINT!;
    this.HEALTHCHECK_ENDPOINT = process.env.HEALTHCHECK_ENDPOINT!;
    this.HEARTBEAT_ENDPOINT = process.env.HEARTBEAT_ENDPOINT!;
    this.REGISTER_ENDPOINT = process.env.REGISTER_ENDPOINT!;
    this.DEREGISTER_ENDPOINT = process.env.DEREGISTER_ENDPOINT!;
    this.TLS_ENABLED = process.env.TLS_ENABLED!;

    this.ensureDefinition();
  }

  public static getInstance() {
    if (ConfigurationService.instance) return ConfigurationService.instance;

    ConfigurationService.instance = new ConfigurationService();

    return ConfigurationService.instance;
  }

  private ensureDefinition(): void {
    const envVariables = Object.entries(this);

    envVariables.forEach(([key, value]) => {
      if (value === undefined) {
        throw new Error(`Required environment variable is missing: ${key}`);
      }
    });
  }
}
