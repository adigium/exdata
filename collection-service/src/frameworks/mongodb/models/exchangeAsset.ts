import { model, Schema } from 'mongoose';
import { ExchangeAsset } from '@entities/exchangeAsset';

export const exchangeAssetSchema = new Schema<ExchangeAsset>(
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
    assetId: {
      type: String,
      required: true,
      ref: 'Asset',
    },
    assetInnerId: { type: String, required: true },
    balance: { type: Number, required: false },
    active: { type: Boolean, required: true },
    deposit: { type: Boolean, required: true },
    withdraw: { type: Boolean, required: true },
    precision: { type: Number, required: false },
  },
  { timestamps: true },
);

export const ExchangeAssetModel = model<ExchangeAsset>('ExchangeAsset', exchangeAssetSchema);
