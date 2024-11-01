import { model, Schema } from 'mongoose';
import { ExchangeAssetNetwork } from '@entities';

export const exchangeAssetNetworkSchema = new Schema<ExchangeAssetNetwork>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
    },
    exchangeAssetId: {
      type: String,
      required: true,
      ref: 'ExchangeAsset',
    },
    networkId: {
      type: String,
      required: true,
      ref: 'Network',
    },
    networkInnerId: {
      type: String,
      required: false,
    },
    exchangeId: {
      type: String,
      required: true,
      ref: 'Exchange',
    },
    confirmations: { type: Number, required: false },
    isDefault: { type: Boolean, required: false },
    isMemoRequired: { type: Boolean, required: false },
    withdrawalEnabled: { type: Boolean, required: false },
    withdrawalFee: { type: String, required: false },
    withdrawalFeePercentage: { type: Boolean, required: false },
    withdrawalMin: { type: String, required: false },
    withdrawalMax: { type: String, required: false },
    depositEnabled: { type: Boolean, required: false },
    depositFee: { type: String, required: false },
    depositFeePercentage: { type: Boolean, required: false },
    depositMin: { type: String, required: false },
    depositMax: { type: String, required: false },
  },
  { timestamps: true },
);

export const ExchangeAssetNetworkModel = model<ExchangeAssetNetwork>(
  'ExchangeAssetNetwork',
  exchangeAssetNetworkSchema,
);
