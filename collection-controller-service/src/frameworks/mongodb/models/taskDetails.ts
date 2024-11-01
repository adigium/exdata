import { model, Schema } from 'mongoose';
import LeanVirtual from 'mongoose-lean-virtuals';
import { TaskDetails, TaskType } from '@entities';

export type ITaskDetails = {
  _id: string;
} & TaskDetails;

export const taskDetailsSchema = new Schema<ITaskDetails>(
  {
    _id: {
      type: String,
      required: true,
      auto: false,
      alias: 'id',
      enum: [
        TaskType.FETCH_CURRENCIES,
        TaskType.FETCH_DEPOSIT_WITHDRAW_FEES,
        TaskType.FETCH_MARKETS,
        TaskType.FETCH_ORDER_BOOKS,
      ],
    },
    complexity: { type: Number, required: true },
    maxInstances: { type: Number, required: true },
    minInstances: { type: Number, required: true },
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
    active: { type: Boolean, required: true },
  },
  { timestamps: true },
);

taskDetailsSchema.plugin(LeanVirtual);

export const TaskDetailsModel = model<ITaskDetails>('TaskDetails', taskDetailsSchema);
