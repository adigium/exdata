import { TaskType } from './taskType';

export interface TaskLogMessage {
  instanceId: string;
  task: TaskType;
  exchange: string;
  status: 'failed' | 'success';
  startedAt: number;
  completedAt: number;
  errorCode?: number;
  errorMessage?: string;
}
