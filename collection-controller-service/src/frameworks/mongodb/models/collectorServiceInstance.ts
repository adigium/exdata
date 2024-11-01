import { model, Schema } from 'mongoose';
import LeanVirtual from 'mongoose-lean-virtuals';
import { CollectorServiceInstance, TaskType } from '@entities';

export type ICollectorServiceInstanceSchema = {
  _id: string;
} & CollectorServiceInstance;

export const collectorServiceTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    task: {
      type: String,
      required: true,
      enum: [
        TaskType.FETCH_CURRENCIES,
        TaskType.FETCH_DEPOSIT_WITHDRAW_FEES,
        TaskType.FETCH_MARKETS,
        TaskType.FETCH_ORDER_BOOKS,
      ],
    },
    exchange: { type: String, required: true },
    complexity: { type: Number, required: true },
    lastStatus: { type: String, required: true, enum: ['failed', 'success'] },
    lastUpdatedAt: { type: Number, requried: false },
    stopRequestedAt: { type: Number, required: false },
    createdAt: { type: Number, required: true, default: () => Date.now() },
    updatedAt: { type: Number, required: false },
  },
  { _id: false },
);

collectorServiceTaskSchema.plugin(LeanVirtual);

export const collectorServiceInstanceSchema = new Schema<ICollectorServiceInstanceSchema>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
      alias: 'id',
    },
    host: { type: String, required: true },
    tasks: {
      type: [collectorServiceTaskSchema],
      required: false,
    },
    isHealthy: { type: Boolean, required: true },
    lastHealthcheck: { type: Number, required: false },
    lastHeartbeat: { type: Number, required: false },
    cpuUsage: { type: Number, required: false },
    memoryUsage: { type: Number, required: false },
  },
  { timestamps: true },
);

collectorServiceInstanceSchema.plugin(LeanVirtual);

export const CollectorServiceInstanceModel = model<ICollectorServiceInstanceSchema>(
  'CollectorServiceInstance',
  collectorServiceInstanceSchema,
);
