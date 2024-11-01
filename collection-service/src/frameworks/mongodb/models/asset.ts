import { model, Schema } from 'mongoose';
import { Asset } from '@entities';

export const assetSchema = new Schema<Asset>(
  {
    _id: {
      type: String,
      required: true,
      auto: true,
    },
    symbolUnified: { type: String, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: false },
    index: { type: Number, required: false },
  },
  { timestamps: true },
);

export const AssetModel = model<Asset>('Asset', assetSchema);
