export type OrderBook = {
  _id: string;
  exchangeId: string;
  symbolInner?: string;
  symbolUnified: string;
  bids: [price: number, amount: number][];
  asks: [price: number, amount: number][];
  nonce: number;
  timestamp: number;
  latency: number;
  synchronizedAt: number;
};
