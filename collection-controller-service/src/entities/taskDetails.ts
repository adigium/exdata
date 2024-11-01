import { TaskType } from './taskType';

export interface TaskDetails {
  task: TaskType;
  complexity: number;
  minInstances: number;
  maxInstances: number;
  active: boolean;
}
