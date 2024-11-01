import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Gate {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = 'spot.balances',
      DEPTH_FULL = 'spot.order_book_update',
      DEPTH_LIGHT = 'spot.order_book',
    }
    export enum Channel {
      DEFAULT = 'DEFAULT',
    }

    export namespace Payload {
      export type Auth = never;
      export type Ping = never;
      export type Pong = never;
      export type Subscription = {
        time: number;
        id: number;
        channel: string;
        event: 'subscribe';
        payload?: string[];
        auth?: {
          method: 'api_key';
          KEY: string;
          SIGN: string;
        };
      };
      export type Unsubscription = {
        time: number;
        id: number;
        channel: string;
        event: 'unsubscribe';
        payload?: string[];
        auth?: {
          method: 'api_key';
          KEY: string;
          SIGN: string;
        };
      };
    }

    export namespace Response {
      export type Auth = never;
      export type Ping = never;
      export type Pong = never;
      export type Subscription = {
        id: number | string;
        time: number;
        time_ms: number;
        channel: string;
        event: 'subscribe';
        error?: { code: number; message: string } | null;
      };
      export type Unsubscription = {
        id: number | string;
        time: number;
        time_ms: number;
        channel: string;
        event: 'unsubscribe';
        error?: { code: number; message: string } | null;
      };
    }

    export namespace Message {
      export type DepthFull = {
        event: 'update';
        channel: Topic.DEPTH_FULL;
        time: number;
        result: {
          a: [price: string, size: string][];
          b: [price: string, size: string][];
          U: number;
          u: number;
          s: string;
          t: number;
        };
      };

      export type DepthLight = {
        event: 'update';
        channel: Topic.DEPTH_LIGHT;
        time: number;
        result: {
          asks: [price: string, size: string][];
          bids: [price: string, size: string][];
          t: number;
          s: string;
          lastUpdateId: number;
        };
      };

      export type BalanceUpdates = {
        time: number;
        time_ms: number;
        channel: Topic.BALANCE_UPDATES;
        event: 'update';
        result: [
          {
            timestamp: number | string;
            timestamp_ms: number | string;
            user: string;
            currency: string;
            change: string;
            total: string;
            available: string;
            freeze: string;
            freeze_change: string;
            change_type: string;
          },
        ];
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
