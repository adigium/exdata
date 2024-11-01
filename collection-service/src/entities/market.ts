export interface Market {
  active: boolean;
  baseExchangeAssetId: string;
  exchangeId: string;
  feeMaker: number;
  feePercentage: boolean;
  feeTaker: number;
  _id: string;
  notionalMax?: number;
  notionalMin?: number;
  orderBookId?: string;
  precisionAmount?: number;
  precisionBase?: number;
  precisionCost?: number;
  precisionPrice?: number;
  precisionQuote?: number;
  priceMax?: number;
  priceMin?: number;
  quantityMax?: number;
  quantityMin?: number;
  quoteExchangeAssetId: string;
  symbolInner: string;
  symbolUnified: string;
}
