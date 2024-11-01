import { model, Schema } from 'mongoose';
import LeanVirtual from 'mongoose-lean-virtuals';
import { v4 as uuid } from 'uuid';
import { TaskControlMessage, TaskType } from '@entities';

export type ITaskControlMessage = {
  _id: string;
} & TaskControlMessage;

export const taskControlMessageSchema = new Schema<ITaskControlMessage>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
      alias: 'id',
      default: uuid,
    },
    exchanges: { type: [String], required: true },
    instanceId: { type: String, required: true },
    opCode: { type: String, required: true, enum: ['start', 'stop'] },
    taskType: {
      type: String,
      required: true,
      enum: [
        TaskType.FETCH_CURRENCIES,
        TaskType.FETCH_DEPOSIT_WITHDRAW_FEES,
        TaskType.FETCH_MARKETS,
        TaskType.FETCH_ORDER_BOOKS,
      ],
    },
  },
  { timestamps: true },
);

taskControlMessageSchema.plugin(LeanVirtual);

export const TaskControlMessageModel = model<ITaskControlMessage>(
  'TaskControlMessage',
  taskControlMessageSchema,
);
