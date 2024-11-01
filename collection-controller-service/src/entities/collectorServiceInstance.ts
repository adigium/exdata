import { TaskType } from './taskType';

export interface CollectorServiceInstance {
  id: string;
  host: string;
  tasks?: {
    id: string;
    task: TaskType;
    exchange: string;
    complexity: number;
    lastStatus?: 'failed' | 'success';
    lastUpdatedAt?: number;
    stopRequestedAt?: number;
    createdAt: number;
    updatedAt?: number;
  }[];
  isHealthy: boolean;
  lastHealthcheck: number;
  lastHeartbeat: number;
  cpuUsage?: number;
  memoryUsage?: number;
}
