import { model, Schema } from 'mongoose';
import LeanVirtual from 'mongoose-lean-virtuals';
import { Exchange } from '@entities/exchange';

export type IExchange = {
  _id: string;
} & Exchange;

export const exchangeSchema = new Schema<IExchange>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
      alias: 'id',
    },
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

exchangeSchema.plugin(LeanVirtual);

export const ExchangeModel = model<IExchange>('Exchange', exchangeSchema);
