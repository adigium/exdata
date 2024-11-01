import { model, Schema } from 'mongoose';
import { OrderBook } from '@entities';

export const orderBookSchema = new Schema<OrderBook>(
  {
    _id: {
      type: String,
      required: true,
      alias: 'id',
    },
    exchangeId: {
      type: String,
      required: true,
      ref: 'Exchange',
    },
    symbolInner: { type: String, required: false },
    symbolUnified: { type: String, required: true },
    asks: {
      type: [
        [
          { type: Number, required: true },
          { type: Number, required: true },
        ],
      ],
      required: true,
    },
    bids: {
      type: [
        [
          { type: Number, required: true },
          { type: Number, required: true },
        ],
      ],
      required: true,
    },
    nonce: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    latency: { type: Number, required: false },
    synchronizedAt: { type: Number, required: true },
  },
  { timestamps: true },
);

export const OrderBookModel = model<OrderBook>('OrderBook', orderBookSchema);
