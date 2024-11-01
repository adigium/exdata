import { Websocket as WS } from '../../types';
import { constants } from './constants';

export namespace Kucoin {
  export const Constant = constants;

  export namespace Websocket {
    export enum Topic {
      BALANCE_UPDATES = '/account/balance',
      DEPTH_FULL = '/market/level2',
      DEPTH_LIGHT = '/spotMarket/level2Depth5',
    }
    export enum Channel {
      PRIVATE = 'PRIVATE',
      PUBLIC = 'PUBLIC',
    }

    export namespace Payload {
      export type Auth = never;
      export type Ping = {
        id: string;
        type: 'ping';
      };
      export type Pong = never;
      export type Subscription = {
        id: string;
        type: 'subscribe';
        topic: string;
        privateChannel: boolean;
        response: boolean;
      };
      export type Unsubscription = {
        id: string;
        type: 'unsubscribe';
        topic: string;
        privateChannel: boolean;
        response: boolean;
      };
    }

    export namespace Response {
      export type Auth = never;
      export type Ping = never;
      export type Pong = {
        id: string;
        type: 'pong';
      };
      export type Subscription = {
        id: number | string;
        type: 'ack';
      };
      export type Unsubscription = {
        id: number | string;
        type: 'ack';
      };
    }

    export namespace Message {
      export type DepthFull = {
        type: 'message';
        topic: `${Topic.DEPTH_FULL}:${string}`;
        subject: string;
        data: {
          changes: {
            asks: [price: string, size: string, sequence: string][];
            bids: [price: string, size: string, sequence: string][];
          };
          sequenceEnd: number;
          sequenceStart: number;
          symbol: string;
          time: number;
        };
      };

      export type DepthLight = {
        type: 'message';
        topic: `${Topic.DEPTH_LIGHT}:${string}`;
        subject: string;
        data: {
          asks: [price: string, size: string][];
          bids: [price: string, size: string][];
          timestamp: number;
        };
      };

      export type BalanceUpdates = {
        type: 'message';
        topic: '/account/balance';
        subject: 'account.balance';
        channelType: 'private';
        data: {
          total: string;
          available: string;
          availableChange: string;
          currency: string;
          hold: string;
          holdChange: string;
          relationEvent: string;
          relationEventId: string;
          relationContext: any;
          time: number | string;
        };
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
