import {
  CollectorServiceInstance,
  Exchange,
  TaskControlMessage,
  TaskDetails,
  TaskLogMessage,
  TaskType,
} from '@entities';

export interface DatabaseRepository {
  connect(): Promise<Failable>;
  disconnect(): Promise<Failable>;

  createTaskControlMessage(taskControl: TaskControlMessage): Promise<Failable>;
  createTaskLogMessage(taskLog: TaskLogMessage): Promise<Failable>;

  getCollectorServiceInstance(id: string): Promise<Failable<CollectorServiceInstance>>;
  getCollectorServiceInstances(): Promise<Failable<CollectorServiceInstance[]>>;

  createCollectorServiceInstance(instance: CollectorServiceInstance): Promise<Failable>;
  updateCollectorServiceInstance(id: string, instance: Partial<CollectorServiceInstance>): Promise<Failable>;
  deleteCollectorServiceInstance(id: string): Promise<Failable>;

  getTasksDetails(): Promise<Failable<TaskDetails[]>>;
  getTaskDetails(task: TaskType): Promise<Failable<TaskDetails>>;

  getExchanges(): Promise<Failable<Exchange[]>>;
  getExchange(id: string): Promise<Failable<Exchange>>;

  isHealthy(): Promise<Failable<boolean>>;
}
