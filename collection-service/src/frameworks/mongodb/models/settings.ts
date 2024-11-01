import { model, Schema } from 'mongoose';
import { Settings } from '@entities';

export const settingsSchema = new Schema<Settings>(
  {
    isCollectionEnabled: { type: Boolean, required: true },

    collectionServiceTaskIntervalMs: { type: Number, required: true },
    collectionServiceHearbeatIntervalMs: { type: Number, required: true },
    collectionServiceHearbeatRetryIntervalMs: { type: Number, required: true },
    collectionServiceRegisterRetries: { type: Number, required: true },
    collectionServiceRegisterRetryIntervalMs: { type: Number, required: true },

    assetsRankThreshold: { type: Number, required: true },
    orderBookLatencySavingBound: { type: Number, required: true },
    orderBookSyncThrottleIntervalMs: { type: Number, required: true },
    orderBookOutOfSyncThrottleIntervalMs: { type: Number, required: true },
    balancesLatencySavingBound: { type: Number, required: true },
    balancesSyncDebounceDelayMs: { type: Number, required: true },
    websocketsPingingFrequencyMultiplier: { type: Number, required: true },
  },
  { timestamps: false },
);

export const SettingsModel = model<Settings>('Settings', settingsSchema);
