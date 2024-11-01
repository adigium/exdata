import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Binance {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = 'outboundAccountPosition',
      DEPTH_FULL = 'depth',
      DEPTH_LIGHT = 'depth5',
    }
    export enum Channel {
      PUBLIC = 'PUBLIC',
      USER_DATA = 'USER_DATA',
    }

    export namespace Payload {
      export type Authenticate = never;
      export type Ping = never;
      export type Pong = never;
      export type Subscription = {
        method: 'SUBSCRIBE';
        params: string[];
        id: number | string;
      };
      export type Unsubscription = {
        method: 'UNSUBSCRIBE';
        params: string[];
        id: number | string;
      };
    }

    export namespace Response {
      export type Authenticate = never;
      export type Ping = never;
      export type Pong = never;
      export type Subscription = {
        result: null;
        id: null | number | string;
        error?: { code: number; msg: string };
      };
      export type Unsubscription = {
        result: null;
        id: null | number | string;
        error?: { code: number; msg: string };
      };
    }

    export namespace Message {
      export type DepthFull = {
        stream: string;
        data: {
          e: 'depthUpdate';
          E: number;
          s: string;
          U: number;
          u: number;
          b: [[price: string, size: string]];
          a: [[price: string, size: string]];
        };
      };

      export type DepthLight = {
        stream: string;
        data: {
          lastUpdateId: number;
          bids: [[price: string, size: string]];
          asks: [[price: string, size: string]];
        };
      };

      export type BalanceUpdates = {
        /** Event type */
        e: 'outboundAccountPosition';
        /** Event time */
        E: number;
        /** Last account update time */
        u: number;
        /** Balances array */
        B: {
          /** Asset */
          a: string;
          /** Free */
          f: string;
          /** Locked */
          l: string;
        }[];
      };
    }

    export type Payloads = WS.Exchange.Actions<{
      [WS.Action.AUTH]: Payload.Authenticate;
      [WS.Action.PING]: Payload.Ping;
      [WS.Action.PONG]: Payload.Pong;
      [WS.Action.SUBSCRIBE]: Payload.Subscription;
      [WS.Action.UNSUBSCRIBE]: Payload.Unsubscription;
    }>;

    export type Messages = WS.Exchange.Messages<{
      [WS.Action.AUTH]: Response.Authenticate;
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
