import { TaskType } from './taskType';

export interface TaskControlMessage {
  instanceId: string;
  opCode: 'start' | 'stop';
  taskType: TaskType;
  exchanges: string[];
}
