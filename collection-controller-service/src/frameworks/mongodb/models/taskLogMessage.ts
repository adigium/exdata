import { model, Schema } from 'mongoose';
import LeanVirtual from 'mongoose-lean-virtuals';
import { v4 as uuid } from 'uuid';
import { TaskLogMessage, TaskType } from '@entities';

export type ITaskLogMessage = {
  _id: string;
} & TaskLogMessage;

export const taskLogMessageSchema = new Schema<ITaskLogMessage>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
      alias: 'id',
      default: uuid,
    },
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
    instanceId: { type: String, required: true },
    status: { type: String, required: true, enum: ['success', 'failed'] },
    startedAt: { type: Number, required: true },
    completedAt: { type: Number, required: true },
    errorCode: { type: Number, required: false },
    errorMessage: { type: String, required: false },
  },
  { timestamps: true },
);

taskLogMessageSchema.plugin(LeanVirtual);

export const TaskLogMessageModel = model<ITaskLogMessage>('TaskLogMessage', taskLogMessageSchema);
