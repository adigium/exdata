import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Bybit {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = 'wallet',
      DEPTH_FULL = 'orderbook.200',
      DEPTH_LIGHT = 'orderbook.50',
    }
    export enum Channel {
      PRIVATE = 'PRIVATE',
      PUBLIC = 'PUBLIC',
    }

    export namespace Payload {
      export type Auth = {
        req_id: string;
        op: 'auth';
        args: [apiKey: string, expires: number, signature: string];
      };
      export type Ping = { req_id: string; op: 'ping' };
      export type Pong = never;
      export type Subscription = {
        req_id: string;
        op: 'subscribe';
        args: string[];
      };
      export type Unsubscription = {
        req_id: string;
        op: 'unsubscribe';
        args: string[];
      };
    }

    export namespace Response {
      export type Auth = {
        req_id: string;
        success: boolean;
        ret_msg: string;
        op: 'auth';
        conn_id: string;
      };
      export type Ping = never;
      export type Pong = {
        success: boolean;
        req_id: string;
        ret_msg: 'pong';
        conn_id: string;
        op: 'ping';
      };
      export type Subscription = {
        success: boolean;
        ret_msg: 'subscribe';
        conn_id: string;
        req_id: string;
        op: 'subscribe';
      };
      export type Unsubscription = {
        success: boolean;
        ret_msg: 'unsubscribe';
        conn_id: string;
        req_id: string;
        op: 'unsubscribe';
      };
    }

    export namespace Message {
      export type DepthFull = {
        topic: `${Topic.DEPTH_FULL}.${string}`;
        type: 'delta' | 'snapshot';
        /** The timestamp (ms) that the system generates the data */
        ts: number;
        data: {
          /** Symbol name */
          s: string;
          /** Bids. For snapshot stream, the element is sorted by price in descending order */
          b: [[price: string, size: string]];
          /** Asks. For snapshot stream, the element is sorted by price in ascending order */
          a: [[price: string, size: string]];
          /** Update ID. Is a sequence. Occasionally, you'll receive "u"=1, which is a snapshot data due to the restart of the service. So please overwrite your local orderbook */
          u: number;
          /** Cross sequence: You can use this field to compare different levels orderbook data, and for the smaller seq, then it means the data is generated earlier */
          seq: number;
        };
        /** The timestamp from the match engine when this orderbook data is produced. It can be correlated with T from public trade channel */
        cts: number;
      };

      export type DepthLight = {
        topic: `${Topic.DEPTH_LIGHT}.${string}`;
        type: 'delta' | 'snapshot';
        /** The timestamp (ms) that the system generates the data */
        ts: number;
        data: {
          /** Symbol name */
          s: string;
          /** Bids. For snapshot stream, the element is sorted by price in descending order */
          b: [[price: string, size: string]];
          /** Asks. For snapshot stream, the element is sorted by price in ascending order */
          a: [[price: string, size: string]];
          /** Update ID. Is a sequence. Occasionally, you'll receive "u"=1, which is a snapshot data due to the restart of the service. So please overwrite your local orderbook */
          u: number;
          /** Cross sequence: You can use this field to compare different levels orderbook data, and for the smaller seq, then it means the data is generated earlier */
          seq: number;
        };
        /** The timestamp from the match engine when this orderbook data is produced. It can be correlated with T from public trade channel */
        cts: number;
      };

      export type BalanceUpdates = {
        id: string;
        topic: Topic.BALANCE_UPDATES;
        creationTime: number;
        data: {
          accountIMRate: string;
          accountMMRate: string;
          totalEquity: string;
          totalWalletBalance: string;
          totalMarginBalance: string;
          totalAvailableBalance: string;
          totalPerpUPL: string;
          totalInitialMargin: string;
          totalMaintenanceMargin: string;
          coin: {
            coin: string;
            equity: string;
            usdValue: string;
            walletBalance: string;
            availableToWithdraw: string;
            availableToBorrow: string;
            borrowAmount: string;
            accruedInterest: string;
            totalOrderIM: string;
            totalPositionIM: string;
            totalPositionMM: string;
            unrealisedPnl: string;
            cumRealisedPnl: string;
            bonus?: string;
            collateralSwitch?: boolean;
            marginCollateral?: boolean;
            free?: string;
            locked: string;
            spotHedgingQty?: string;
          }[];
          accountLTV: string;
          accountType: string;
        }[];
      };
    }

    export type Payloads = WS.Exchange.Actions<{
      [WS.Action.AUTH]: Payload.Auth;
      [WS.Action.PING]: Payload.Ping;
      [WS.Action.PONG]: Payload.Pong;
      [WS.Action.SUBSCRIBE]: Payload.Subscription;
      [WS.Action.UNSUBSCRIBE]: Payload.Unsubscription;
    }>;

    export type Messages = WS.Exchange.Messages<{
      [WS.Action.AUTH]: Response.Auth;
      [WS.Action.PING]: Response.Ping;
      [WS.Action.PONG]: Response.Pong;
      [WS.Action.SUBSCRIBE]: Response.Subscription;
      [WS.Action.UNSUBSCRIBE]: Response.Unsubscription;
      [WS.Topic.DEPTH_FULL]: Message.DepthFull;
      [WS.Topic.DEPTH_LIGHT]: Message.DepthLight;
      [WS.Topic.BALANCE_UPDATES]: Message.BalanceUpdates;
    }>;
  }
}
