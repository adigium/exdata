import { Emitter } from 'strict-event-emitter';
import { v4 as uuid } from 'uuid';
import { CollectorServiceInstance, TaskControlMessage, TaskType } from '@entities';
import { DatabaseRepository } from '@repositories';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

/*
  1. Dynamic Complexity Ratings: Task complexity can be dynamically adjusted based on historical data regarding the actual resources consumed by tasks.
  2. Real-time Metrics Integration: Integrate real-time monitoring tools to update cpuUsage and memoryUsage in real-time, allowing for more responsive load balancing.
  3. Customizable Weighting: Adjust the weight given to CPU usage, memory usage, and task complexity in the load calculation formula based on observed system performance and priorities.
  4. Handling Task Variability: For tasks with highly variable resource demands, consider implementing a feedback loop where tasks can be reassigned or adjusted in complexity based on observed performance.
  5. Load Calculation: Instances are selected based on a comprehensive load calculation, considering both the quantity and complexity of tasks.
  6. Performance-Based Allocation: Task allocation decisions are informed by real-time performance metrics, optimizing resource utilization.
  7. Redundancy: Critical tasks are assigned redundancy to enhance fault tolerance.
  8. Dynamic Scaling: The system can scale instances dynamically based on real-time demand and load, ensuring efficiency and responsiveness.
  9. Monitoring and Alerting: Real-time monitoring and alerting mechanisms are in place for proactive system management and issue resolution.
  10. Performance Metrics Collection: Integrate or develop a system for collecting and updating performance metrics for each instance, possibly using a combination of internal metrics and external monitoring tools.
  11. Intelligent Task Prioritization: Develop logic to prioritize tasks based on their importance, urgency, or potential impact on system performance.
  12. Automated Health Checks and Recovery: Implement automated health checks that can detect and recover from instance failures, including automatically reassigning tasks from failed instances.
  13. Security and Authentication: Ensure secure communication channels between the CTC, instances, and any external monitoring or scaling services, including authentication and encryption.
  14. Retry Logic: Implement retry logic in Kafka communication to handle transient failures.
  15. Throttling: Prevent overload during task redistribution by throttling the rate at which tasks are reassigned.
  16. Fallback Strategies: In case no suitable instance is found for a critical task, have a fallback strategy, such as spinning up a new instance or using a "last-resort" instance with spare capacity.
*/

export class TaskRedistributionService extends Emitter<{
  'redistribution-done': [taskControls: TaskControlMessage[]];
}> {
  private logger: LoggerModule;

  private database: DatabaseRepository;
  private httpClient: HttpClientModule;

  private taskUpdateThreshold: number;
  private healthCheckThreshold: number;
  private heartbeatThreshold: number;

  private redistributionFrequency: number;
  private lastRedistributionAt: number | undefined;

  private isRedistributing: boolean;

  constructor(input: {
    DI: { database: DatabaseRepository; httpClient: HttpClientModule };
    taskUpdateThreshold: number;
    healthCheckThreshold: number;
    heartbeatThreshold: number;
    redistributionFrequency: number;
  }) {
    super();

    const { DI, taskUpdateThreshold, healthCheckThreshold, heartbeatThreshold, redistributionFrequency } =
      input;

    this.database = DI.database;
    this.httpClient = DI.httpClient;

    this.taskUpdateThreshold = taskUpdateThreshold;
    this.healthCheckThreshold = healthCheckThreshold;
    this.heartbeatThreshold = heartbeatThreshold;

    this.redistributionFrequency = redistributionFrequency;

    this.isRedistributing = false;

    this.logger = new Logger(new ConsoleLoggerStrategy(), this.constructor.name);
  }

  public async redistributeTasks(): Promise<void> {
    if (
      this.isRedistributing ||
      Date.now() - (this.lastRedistributionAt || 0) < this.redistributionFrequency
    ) {
      return;
    }

    this.isRedistributing = true;

    const tasksDesiredState = await this.getTasks();

    // this.logger.debug(
    //   `Desired distribution state: ${tasksDesiredState.map((task) => `${task.task}:${task.exchange}`).join(', ')}`,
    // );

    const redistributionMessages: TaskControlMessage[] = [];

    // TODO: Fix: Does not take into account difference between load of instances, when all tasks are in desired state
    for (const { task: taskType, exchange, maxInstances, minInstances, complexity } of tasksDesiredState) {
      const {
        success: instancesSuccess,
        data: instances,
        error: instancesError,
      } = await this.database.getCollectorServiceInstances();

      if (!instancesSuccess || !instances || !!instancesError) {
        this.logger.error(`Failed to fetch collector instances: ${instancesError}`);
        return;
      }

      const instancesHealthy = this.getHealthyInstances(instances);

      // this.logger.debug(
      //   `Instances before => ${instances.map((instance) => `\n\t${instance.id.substring(0, 4)}: ${instance.tasks?.map((task) => `\n\t\t${task.id.substring(0, 2)}/${task.task}/${task.exchange}/${task.lastStatus}/${task.createdAt}(${Date.now() - task.createdAt < this.taskUpdateThreshold ? 'ok' : 'bad'})/${task.lastUpdatedAt ? `${task.lastUpdatedAt}(${Date.now() - task.lastUpdatedAt < this.taskUpdateThreshold ? 'ok' : 'bad'})` : 'null'}/${task.stopRequestedAt ? 'dead' : 'alive'}`).join(', ')}`).join(' | ')}`,
      //   [taskType, exchange],
      // );

      const handlingInstances = instancesHealthy.filter((instance) =>
        instance.tasks?.some(
          (task) =>
            task.task === taskType &&
            task.exchange === exchange &&
            // task.lastStatus === 'success' &&
            ((task.lastUpdatedAt && Date.now() - task.lastUpdatedAt < this.taskUpdateThreshold) ||
              (task.lastUpdatedAt === undefined && Date.now() - task.createdAt < this.taskUpdateThreshold)) &&
            !task.stopRequestedAt,
        ),
      );

      // this.logger.debug(
      //   `Handling => ${handlingInstances.map((instance) => instance.id.substring(0, 4)).join(', ')}`,
      //   [taskType, exchange],
      // );

      const healthyHandlingInstances = handlingInstances.length;

      // this.logger.debug(
      //   `Stats => handling:${healthyHandlingInstances}; min:${minInstances}; max:${maxInstances}`,
      //   [taskType, exchange],
      // );

      if (healthyHandlingInstances >= minInstances && healthyHandlingInstances <= maxInstances) continue;

      if (healthyHandlingInstances < minInstances) {
        const requiredInstancesCount = minInstances - healthyHandlingInstances;

        // this.logger.debug(`Required ${requiredInstancesCount} more instances`, [taskType, exchange]);

        const startRedistributionMessages = await this.getStartRedistributionMessages(
          instancesHealthy,
          exchange,
          taskType,
          complexity,
          requiredInstancesCount,
        );

        // this.logger.debug(
        //   `Requested fix: ${startRedistributionMessages.map((message) => `${message.instanceId.slice(0, 4)}:${message.opCode}:${message.taskType}:${message.exchanges}`).join(', ')}`,
        //   [taskType, exchange],
        // );

        redistributionMessages.push(...startRedistributionMessages);
      }

      if (healthyHandlingInstances > maxInstances) {
        const exceedInstancesCound = healthyHandlingInstances - maxInstances;

        this.logger.debug(`Exceed by ${exceedInstancesCound} instances`, [taskType, exchange]);

        const stopRedistributionMessages = await this.getStopRedistributionMessages(
          instancesHealthy,
          exchange,
          taskType,
          exceedInstancesCound,
        );

        // this.logger.debug(
        //   `Requested fix: ${stopRedistributionMessages.map((message) => `${message.instanceId.slice(0, 4)}:${message.opCode}:${message.taskType}:${message.exchanges}`).join(', ')}`,
        //   [taskType, exchange],
        // );

        redistributionMessages.push(...stopRedistributionMessages);
      }
    }

    // Logic to generate 'stop' messages for tasks that are no longer active or have been reassigned might be needed here

    this.isRedistributing = false;
    this.lastRedistributionAt = Date.now();

    this.logger.debug(
      `Redistribution result: ${redistributionMessages.map((message) => `${message.instanceId.slice(0, 4)}:${message.opCode}:${message.taskType}:${message.exchanges}`).join(', ')}`,
    );

    this.emit('redistribution-done', redistributionMessages);
  }

  private async getStartRedistributionMessages(
    healthyInstances: CollectorServiceInstance[],
    exchange: string,
    taskType: TaskType,
    complexity: number,
    requiredInstancesCount: number,
  ) {
    const redistributionMessages: TaskControlMessage[] = [];

    const instancesForTask: CollectorServiceInstance[] = [];

    const suitableHealthyInstances = healthyInstances.filter(
      (instance) =>
        !instancesForTask.find((queuedInstance) => instance.id === queuedInstance.id) &&
        !instance.tasks?.some((task) => task.exchange === exchange && task.task === taskType),
    );

    // Find all suitable instances and add them to array
    for (let i = 0; i < requiredInstancesCount; i++) {
      const suitableInstance = this.getLeastLoadedInstance(suitableHealthyInstances);

      if (suitableInstance) {
        instancesForTask.push(suitableInstance);
      }
    }

    if (instancesForTask.length !== requiredInstancesCount) {
      this.requestScale();
    }

    // For each suitable instance create Task Control Message and update DB
    for (const instance of instancesForTask) {
      redistributionMessages.push({
        instanceId: instance.id,
        opCode: 'start',
        taskType,
        exchanges: [exchange],
      });

      await this.database.updateCollectorServiceInstance(instance.id, {
        tasks: [
          ...(instance.tasks || []),
          {
            id: uuid(),
            exchange,
            complexity,
            task: taskType,
            lastUpdatedAt: undefined,
            createdAt: Date.now(),
          },
        ],
      });
    }

    return redistributionMessages;
  }

  private async getStopRedistributionMessages(
    healthyInstances: CollectorServiceInstance[],
    exchange: string,
    taskType: TaskType,
    requiredInstancesCount: number,
  ) {
    const redistributionMessages: TaskControlMessage[] = [];

    const instancesForTask: CollectorServiceInstance[] = [];

    const healthyInstancesWithTask = healthyInstances.filter(
      (instance) =>
        !instancesForTask.find((queuedInstance) => instance.id === queuedInstance.id) &&
        !!instance.tasks?.some((task) => task.exchange === exchange && task.task === taskType),
    );

    // Find all most loaded instances with current task and add them to array
    for (let i = 0; i < requiredInstancesCount; i++) {
      const loadedInstanceWithTask = this.getMostLoadedInstance(healthyInstancesWithTask);

      if (loadedInstanceWithTask) {
        instancesForTask.push(loadedInstanceWithTask);
      }
    }

    if (requiredInstancesCount !== instancesForTask.length) {
      this.logger.error(
        `Failed to find all redundant instances doing task: ${exchange}/${taskType} (${requiredInstancesCount}, ${instancesForTask.length})`,
      );
    }

    // For each instance create Task Control Message and update DB
    for (const instance of instancesForTask) {
      redistributionMessages.push({
        instanceId: instance.id,
        opCode: 'stop',
        taskType,
        exchanges: [exchange],
      });

      const tasks = instance.tasks || [];

      const taskUpdate = tasks.find((task) => task.exchange === exchange && task.task === taskType);

      if (!taskUpdate)
        throw new Error(`Not found task update for: ${instance.id} -> ${taskType}/${exchange}`);

      await this.database.updateCollectorServiceInstance(instance.id, {
        tasks: [
          ...tasks.filter((task) => task.id !== taskUpdate.id),
          { ...taskUpdate, stopRequestedAt: Date.now() },
        ],
      });
    }

    return redistributionMessages;
  }

  private async getTasks(): Promise<
    {
      exchange: string;
      task: TaskType;
      minInstances: number;
      maxInstances: number;
      complexity: number;
    }[]
  > {
    const { data: tasks, error: tasksError } = await this.database.getTasksDetails();
    const { data: exchanges, error: exchangesError } = await this.database.getExchanges();

    if (!exchanges || !!exchangesError) {
      this.logger.error(`Failed to fetch exchanges from database: ${exchangesError}`);
      return [];
    }

    if (!tasks || !!tasksError) {
      this.logger.error(`Failed to fetch tasks from database: ${tasksError}`);
      return [];
    }

    return exchanges.reduce(
      (acc, item) => {
        if (!item.active) return acc;

        for (const task of tasks) {
          acc.push({
            exchange: item.id,
            task: task.task,
            maxInstances: task.maxInstances,
            minInstances: task.minInstances,
            complexity: task.complexity,
          });
        }

        return acc;
      },
      [] as {
        exchange: string;
        task: TaskType;
        minInstances: number;
        maxInstances: number;
        complexity: number;
      }[],
    );
  }

  private requestScale() {
    // TODO: Request scale
  }

  private getMostLoadedInstance(instances: CollectorServiceInstance[]): CollectorServiceInstance | undefined {
    return this.getHealthyInstances(instances)
      .sort((a, b) => this.evaluateInstanceLoad(a) - this.evaluateInstanceLoad(b))
      .reverse()[0];
  }

  private getLeastLoadedInstance(
    instances: CollectorServiceInstance[],
  ): CollectorServiceInstance | undefined {
    return this.getHealthyInstances(instances).sort(
      (a, b) => this.evaluateInstanceLoad(a) - this.evaluateInstanceLoad(b),
    )[0];
  }

  private evaluateInstanceLoad(instance: CollectorServiceInstance): number {
    const baseLoad = (instance.cpuUsage || 1) * 0.5 + (instance.memoryUsage || 1) * 0.5; // Example formula that gives equal weight to CPU and memory usage
    const tasksLoad = instance.tasks?.reduce((total, task) => total + task.complexity, 0) ?? 0;
    // Normalize or adjust the tasksLoad based on your system's scale. For instance, if 'complexity' ratings are significantly higher than CPU/Memory percentages, you might want to scale them down.
    const normalizedTasksLoad = tasksLoad / 100; // Example normalization

    return baseLoad + normalizedTasksLoad; // Combine base load and tasks load for total instance load
  }

  private getHealthyInstances(instances: CollectorServiceInstance[]) {
    return instances.filter(
      (instance) =>
        instance.isHealthy &&
        Date.now() - instance.lastHealthcheck < this.healthCheckThreshold &&
        Date.now() - instance.lastHeartbeat < this.heartbeatThreshold,
    );
  }
}
