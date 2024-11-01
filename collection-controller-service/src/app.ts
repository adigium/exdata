import { AxiosHttpClient } from '@adapters/module-http-client';
import { MongoRepository } from '@adapters/repository-database';
import {
  ApplicationService,
  ConfigurationService,
  InstanceHealthService,
  InstanceRegistryService,
  TaskControlService,
  TaskLogService,
  TaskRedistributionService,
} from '@services';

export const start = async () => {
  const configuration = ConfigurationService.getInstance();

  const database = new MongoRepository({ uri: configuration.DATABASE_URI });

  const httpClient = new AxiosHttpClient({});

  const instanceHealthService = new InstanceHealthService({
    DI: { database, httpClient },
    healthcheckPort: configuration.COLLECTOR_HTTP_PORT,
    healthcheckEndpoint: configuration.HEALTHCHECK_ENDPOINT,
    healthcheckInterval: +configuration.HEALTHCHECK_INTERVAL,
    tls: configuration.TLS_ENABLED === 'true',
  });
  const instanceRegistryService = new InstanceRegistryService({
    DI: { database },
  });

  const taskRedistributionService = new TaskRedistributionService({
    DI: { database, httpClient },
    healthCheckThreshold: +configuration.HEALTHCHECK_THRESHOLD,
    heartbeatThreshold: +configuration.HEARTBEAT_THRESHOLD,
    redistributionFrequency: +configuration.REDISTRIBUTION_FREQUENCY,
    taskUpdateThreshold: +configuration.COLLECTOR_TASK_UPDATE_THRESHOLD,
  });

  const taskControlService = new TaskControlService({
    DI: { database, httpClient },
    taskControlEndpoint: configuration.TASK_CONTROL_ENDPOINT,
    taskControlPort: configuration.COLLECTOR_HTTP_PORT,
    tls: configuration.TLS_ENABLED === 'true',
  });

  const taskLogService = new TaskLogService({
    DI: { database },
    taskLogEndpoint: configuration.TASK_LOG_ENDPOINT,
  });

  const application = new ApplicationService({
    DI: {
      database,
      instanceRegistryService,
      instanceHealthService,
      taskRedistributionService,
      taskControlService,
      taskLogService,
    },
    registerEndpoint: configuration.REGISTER_ENDPOINT,
    deregisterEndpoint: configuration.DEREGISTER_ENDPOINT,
    heartbeatEndpoint: configuration.HEARTBEAT_ENDPOINT,
    httpPort: +configuration.CONTROLLER_HTTP_PORT,
  });

  await application.start();
};
