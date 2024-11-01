import { model, Schema } from 'mongoose';
import { Network } from '@entities';

export const networkSchema = new Schema<Network>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    txTime: { type: Number, required: false },
    consensusTime: { type: Number, required: false },
  },
  { timestamps: true },
);

export const NetworkModel = model<Network>('Network', networkSchema);
