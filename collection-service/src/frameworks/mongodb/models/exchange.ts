import { model, Schema } from 'mongoose';
import { Exchange } from '@entities/exchange';

export const exchangeSchema = new Schema<Exchange>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
    },
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const ExchangeModel = model<Exchange>('Exchange', exchangeSchema);
