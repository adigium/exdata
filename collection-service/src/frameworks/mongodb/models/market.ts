import { model, Schema } from 'mongoose';
import { Market } from '@entities';

export const marketSchema = new Schema<Market>(
  {
    _id: { type: String, required: true },
    baseExchangeAssetId: {
      type: String,
      required: true,
      ref: 'ExchangeAsset',
    },
    quoteExchangeAssetId: {
      type: String,
      required: true,
      ref: 'ExchangeAsset',
    },
    exchangeId: {
      type: String,
      required: true,
      ref: 'Exchange',
    },
    orderBookId: {
      type: String,
      required: false,
      ref: 'OrderBook',
    },
    active: { type: Boolean, required: true },
    symbolInner: { type: String, required: true },
    symbolUnified: { type: String, required: true },
    feeMaker: { type: Number, required: true },
    feeTaker: { type: Number, required: true },
    feePercentage: { type: Boolean, required: false },
    priceMin: { type: Number, required: false },
    priceMax: { type: Number, required: false },
    quantityMin: { type: Number, required: false },
    quantityMax: { type: Number, required: false },
    notionalMin: { type: Number, required: false },
    notionalMax: { type: Number, required: false },
    precisionAmount: { type: Number, required: false },
    precisionBase: { type: Number, required: false },
    precisionCost: { type: Number, required: false },
    precisionPrice: { type: Number, required: false },
    precisionQuote: { type: Number, required: false },
  },
  { timestamps: true },
);

export const MarketModel = model<Market>('Market', marketSchema);
