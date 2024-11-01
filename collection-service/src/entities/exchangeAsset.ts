export interface ExchangeAsset {
  _id: string;
  active: boolean;
  assetId: string;
  assetInnerId: string;
  balance?: string;
  deposit: boolean;
  exchangeId: string;
  precision: number;
  withdraw: boolean;
}

export interface ExchangeAssetBalance {
  _id: string;
  exchangeId: string;
  exchangeAssetId: string;
  accountType: string;
  free: string;
  used: string;
  total: string;
  timestamp: number;
}

export interface ExchangeAssetNetwork {
  _id: string;
  depositEnabled?: boolean;
  depositFee?: number;
  depositFeePercentage?: boolean;
  depositMax?: string;
  depositMin?: string;
  exchangeAssetId: string;
  isDefault?: boolean;
  isMemoRequired?: boolean;
  networkId: string;
  networkInnerId?: string;
  exchangeId: string;
  confirmations?: number;
  withdrawalEnabled?: boolean;
  withdrawalFee?: number;
  withdrawalFeePercentage?: boolean;
  withdrawalMax?: string;
  withdrawalMin?: string;
}
