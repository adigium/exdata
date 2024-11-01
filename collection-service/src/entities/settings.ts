export type Settings = {
  isCollectionEnabled: boolean;

  collectionServiceTaskIntervalMs: number;
  collectionServiceHearbeatIntervalMs: number;
  collectionServiceHearbeatRetryIntervalMs: number;
  collectionServiceRegisterRetries: number;
  collectionServiceRegisterRetryIntervalMs: number;

  assetsRankThreshold: number;
  orderBookLatencySavingBound: number;
  orderBookSyncThrottleIntervalMs: number;
  orderBookOutOfSyncThrottleIntervalMs: number;
  balancesLatencySavingBound: number;
  balancesSyncDebounceDelayMs: number;
  websocketsPingingFrequencyMultiplier: number;
};
