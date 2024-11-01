import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Mexc {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = 'spot@private.account.v3.api',
      DEPTH_FULL = 'spot@public.increase.depth.v3.api',
      DEPTH_LIGHT = 'spot@public.limit.depth.v3.api',
    }
    export enum Channel {
      PUBLIC = 'PUBLIC',
      USER_DATA = 'USER_DATA',
    }

    export namespace Payload {
      export type Auth = never;
      export type Ping = { id: number; method: 'PING' };
      export type Pong = never;
      export type Subscription = {
        method: 'SUBSCRIPTION';
        params: string[];
        id: number;
      };
      export type Unsubscription = {
        method: 'UNSUBSCRIPTION';
        params: string[];
        id: number;
      };
    }

    export namespace Response {
      export type Auth = never;
      export type Ping = never;
      export type Pong = { id: number; code: number; msg: 'PONG' };
      export type Subscription = { id: number; code: number; msg: string };
      export type Unsubscription = { id: number; code: number; msg: string };
    }

    export namespace Message {
      export type DepthFull = {
        c: `${Topic.DEPTH_FULL}@${string}`;
        d: {
          asks: [{ p: string; v: string }];
          bids: [{ p: string; v: string }];
          e: Topic.DEPTH_FULL;
          r: string;
        };
        s: string;
        t: number;
      };

      export type DepthLight = {
        c: `${Topic.DEPTH_LIGHT}@${string}@${number}`;
        d: {
          asks: [{ p: string; v: string }];
          bids: [{ p: string; v: string }];
          e: Topic.DEPTH_LIGHT;
          r: string;
        };
        s: string;
        t: number;
      };

      export type BalanceUpdates = {
        c: Topic.BALANCE_UPDATES;
        /** Balance updates */
        d: {
          /** Asset */
          a: string;
          /** Change time */
          c: number;
          /** Free */
          f: string;
          /** Free change */
          fd: string;
          /** Locked */
          l: string;
          /** Locked change */
          ld: string;
          /** Changed type */
          o: string;
        };
        /** Event time */
        t: number;
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
