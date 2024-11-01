import { model, Schema } from 'mongoose';
import { ExchangeAssetBalance } from '@entities';

export const exchangeAssetBalanceSchema = new Schema<ExchangeAssetBalance>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
    },
    exchangeId: {
      type: String,
      required: true,
      ref: 'Exchange',
    },
    exchangeAssetId: {
      type: String,
      required: true,
      ref: 'ExchangeAsset',
    },
    accountType: {
      type: String,
      required: true,
    },
    free: {
      type: String,
      required: true,
    },
    used: {
      type: String,
      required: true,
    },
    total: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const ExchangeAssetBalanceModel = model<ExchangeAssetBalance>(
  'ExchangeAssetBalance',
  exchangeAssetBalanceSchema,
);
