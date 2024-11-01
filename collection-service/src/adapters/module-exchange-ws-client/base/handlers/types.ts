export namespace Topic {
  export namespace Unified {
    export type Depth = {
      timestamp: number;
      symbolInner: string;
      startUpdateId: number;
      finalUpdateId: number;
      bids: [price: string, size: string][];
      asks: [price: string, size: string][];
      isSnapshot?: boolean;
    };

    export type Balance = {
      timestamp: number;
      assetInner: string;
      accountType: string;
      free: string;
      used: string;
      total: string;
      isSnapshot: boolean;
    };
  }
}
