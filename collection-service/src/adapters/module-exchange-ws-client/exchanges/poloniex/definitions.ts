import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Poloniex {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = 'balances',
      DEPTH_FULL = 'book',
      DEPTH_LIGHT = 'book_lv2',
    }
    export enum Channel {
      PRIVATE = 'PRIVATE',
      PUBLIC = 'PUBLIC',
    }

    export namespace Payload {
      export type Auth = {
        event: 'subscribe';
        channel: ['auth'];
        params: {
          key: string;
          signTimestamp: number;
          signatureMethod?: 'HmacSHA256';
          signatureVersion?: '2';
          signature: string;
        };
      };
      export type Ping = {
        event: 'ping';
      };
      export type Pong = never;
      export type Subscription =
        | {
            event: 'subscribe';
            channel: [channel: Topic.DEPTH_FULL];
            symbols: string[];
            depth: number;
          }
        | {
            event: 'subscribe';
            channel: [channel: Topic.DEPTH_LIGHT];
            symbols: string[];
          }
        | { event: 'subscribe'; channel: [channel: Topic.BALANCE_UPDATES] };
      export type Unsubscription =
        | {
            event: 'unsubscribe';
            channel: [channel: Topic.DEPTH_FULL];
            symbols: string[];
            depth: number;
          }
        | {
            event: 'unsubscribe';
            channel: [channel: Topic.DEPTH_LIGHT];
            symbols: string[];
          }
        | { event: 'unsubscribe'; channel: [channel: Topic.BALANCE_UPDATES] };
    }

    export namespace Response {
      export type Auth =
        | {
            data: {
              success: false;
              message: string;
              ts: number;
            };
            channel: 'auth';
          }
        | {
            data: {
              success: true;
              ts: number;
            };
            channel: 'auth';
          };
      export type Ping = never;
      export type Pong = {
        event: 'pong';
      };
      export type Subscription = {
        event: 'subscribe';
        channel: string;
        symbols?: string[];
      };
      export type Unsubscription = {
        event: 'unsubscribe';
        channel: string;
        symbols?: string[];
      };
    }

    export namespace Message {
      export type DepthFull = {
        channel: Topic.DEPTH_FULL;
        data: Array<{
          asks: [price: string, size: string][];
          bids: [price: string, size: string][];
          createTime: number;
          id: number;
          ts: number;
          symbol: string;
        }>;
      };

      export type DepthLight = {
        channel: Topic.DEPTH_LIGHT;
        action: 'snapshot' | 'update';
        data: Array<{
          asks: [price: string, size: string][];
          bids: [price: string, size: string][];
          createTime: number;
          lastId: number;
          id: number;
          ts: number;
          symbol: string;
        }>;
      };

      export type BalanceUpdates = {
        channel: Topic.BALANCE_UPDATES;
        data: Array<{
          changeTime: number;
          accountId: string;
          accountType: 'SPOT';
          eventType: string;
          available: string;
          currency: string;
          id: number | string;
          userId: number | string;
          hold: string;
          ts: number;
        }>;
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
