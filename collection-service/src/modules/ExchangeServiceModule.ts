import { Emitter } from 'strict-event-emitter';
import { TaskLogMessage, TaskType } from '@entities';

export type ExchangeServiceModuleEvents = {
  ['task-done']: [taskLog: Omit<TaskLogMessage, 'instanceId'>];
};

export interface ExchangeServiceModule extends Emitter<ExchangeServiceModuleEvents> {
  registerTask(task: TaskType): Promise<void>;
  deregisterTask(task: TaskType): Promise<void>;

  setTaskInterval(interval: number, task?: TaskType): void;
  deleteTaskInterval(task: TaskType): void;

  start(): Promise<void>;
  stop(): Promise<void>;

  getId(): string;
}
