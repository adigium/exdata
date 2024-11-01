import { Websocket as WebsocketClass, WebsocketSides } from '@frameworks/websocket';
import { constants } from './constants';

export namespace Websocket {
  export const Constants = constants;

  /**
   * Enum representing the various actions that can be performed over the websocket.
   * - AUTHENTICATE: Action to authenticate the websocket connection/message.
   * - PING: Action to send a ping message.
   * - PONG: Action to send a pong message.
   * - SUBSCRIBE: Action to subscribe to a topic.
   * - UNSUBSCRIBE: Action to unsubscribe from a topic.
   */
  export enum Action {
    AUTH = 'AUTH',
    PING = 'PING',
    PONG = 'PONG',
    SUBSCRIBE = 'SUBSCRIBE',
    UNSUBSCRIBE = 'UNSUBSCRIBE',
  }

  /**
   * Enum representing the different topics that can be subscribed to over the websocket.
   * - BALANCE_UPDATES: Topic for balance updates.
   * - DEPTH_FULL: Topic for full depth updates.
   * - DEPTH_LIGHT: Topic for light depth updates.
   */
  export enum Topic {
    BALANCE_UPDATES = 'BALANCE_UPDATES',
    DEPTH_FULL = 'DEPTH_FULL',
    DEPTH_LIGHT = 'DEPTH_LIGHT',
  }

  /**
   * Enum representing the different events that can occur over the websocket.
   * - SUBSCRIBE: Event for subscription.
   * - UNSUBSCRIBE: Event for unsubscription.
   * - UPDATE: Event for updates.
   */
  export enum Event {
    SUBSCRIBE = 'SUBSCRIBE',
    UNSUBSCRIBE = 'UNSUBSCRIBE',
    UPDATE = 'UPDATE',
  }

  /**
   * Enum representing the different authentication schemas that can be used for the websocket.
   * - NONE: No authentication is required.
   * - CONNECTION_STRING: Authentication is included in the connection URL.
   * - ONE_MESSAGE: Authentication is sent in the first message after connection.
   * - PER_MESSAGE: Authentication is required for each message sent.
   */
  export enum Auth {
    CONNECTION_STRING = 'CONNECTION_STRING',
    NONE = 'NONE',
    ONE_MESSAGE = 'ONE_MESSAGE',
    PER_MESSAGE = 'PER_MESSAGE',
  }

  // Exchange types
  export namespace Exchange {
    /**
     * Type representing the actions that can be performed over the websocket.
     * Each key in the Action enum maps to an object or never.
     */
    export type Action = { readonly [K in keyof typeof Action]: never | object };

    /**
     * Type representing the topics that can be subscribed to over the websocket.
     * Each key in the Topic enum maps to an object or never.
     */
    export type Topic = { readonly [K in keyof typeof Topic]: never | object };

    /**
     * Type representing the messages that can be sent or received over the websocket.
     * Combines both Action and Topic types.
     */
    export type Message = Action & Topic;

    /**
     * Utility type to extract actions from the Action type.
     * @template T - The specific action type to extract.
     */
    export type Actions<T extends Action> = T;

    /**
     * Utility type to extract topics from the Topic type.
     * @template T - The specific topic type to extract.
     */
    export type Topics<T extends Topic> = T;

    /**
     * Utility type to extract messages from the Message type.
     * @template T - The specific message type to extract.
     */
    export type Messages<T extends Message> = T;
  }

  // Mapping types
  export namespace Map {
    /**
     * Type representing a mapping from unified topics to inner topics.
     * This helps in translating our standardized topics to exchange-specific topics,
     * allowing for consistent handling across different exchanges.
     * @template TInnerTopic - The type of the inner topic.
     */
    export type UTopicITopic<TInnerTopic extends string> = Record<Topic, TInnerTopic>;

    /**
     * Type representing a mapping from unified topics to channels.
     * This determines which channel we need to use to subscribe to a specific topic,
     * enabling proper routing of subscriptions to the correct websocket channels.
     * @template TChannel - The type of the channel.
     */
    export type UTopicChannel<TChannel extends string> = Record<Topic, TChannel>;

    /**
     * Type representing a mapping from channels to their required authentication schemas.
     * This helps in understanding what type of authentication is required for each specific channel.
     */
    export type UTopicAuthentication = Record<Topic, Auth.NONE | Auth.PER_MESSAGE>;

    /**
     * Type representing a partial mapping from channels to arrays of topics.
     * This specifies which topics are automatically subscribed to when opening a specific type of channel,
     * eliminating the need for additional subscription actions for these topics.
     * @template TChannel - The type of the channel.
     */
    export type ChannelUTopicArray<TChannel extends string> = Partial<Record<TChannel, Topic[]>>;

    /**
     * Type representing a mapping from channels to their required authentication schemas.
     * This helps in understanding what type of authentication is required for each specific channel.
     * @template TChannel - The type of the channel.
     */
    export type ChannelAuthentication<TChannel extends string> = Record<
      TChannel,
      Auth.CONNECTION_STRING | Auth.NONE | Auth.ONE_MESSAGE
    >;
  }

  // Stream types
  export namespace Streams {
    /**
     * Type representing the subjects associated with each topic.
     * - DEPTH_FULL: Subject is a string.
     * - DEPTH_LIGHT: Subject is a string.
     * - BALANCE_UPDATES: No subject (undefined).
     */
    export type UTopicSubject = {
      [Topic.DEPTH_FULL]: string;
      [Topic.DEPTH_LIGHT]: string;
      [Topic.BALANCE_UPDATES]: undefined;
    };

    /**
     * Type representing the arguments for functions that operate on streams.
     * If the subject is undefined, only the topic is required.
     * Otherwise, both the topic and the subject are required.
     * @template TUnifiedTopic - The unified topic type.
     */
    export type FunctionArgs<TUnifiedTopic extends keyof UTopicSubject> =
      UTopicSubject[TUnifiedTopic] extends undefined
        ? [topic: TUnifiedTopic]
        : [topic: TUnifiedTopic, subject: UTopicSubject[TUnifiedTopic]];

    /**
     * Utility function to check if a stream is of a specific topic type.
     * @template TUnifiedTopic - The unified topic type.
     * @template TMap - The mapping type.
     * @param stream - The stream to check.
     * @param topic - The topic to check against.
     * @returns True if the stream is of the specified topic type, false otherwise.
     */
    export const isOfType = <TUnifiedTopic extends Topic, TMap extends Map.UTopicITopic<any> = any>(
      stream: Stream<TMap, Topic>,
      topic: TUnifiedTopic,
    ): stream is Stream<TMap, TUnifiedTopic> => stream.topic === topic;
  }

  /**
   * Type representing a stream in the websocket.
   * @template TUnifiedInnerTopic - The unified inner topic type.
   * @template TUnifiedTopic - The unified topic type.
   */
  export type Stream<
    TUnifiedInnerTopic extends Map.UTopicITopic<any> = any,
    TUnifiedTopic extends keyof Streams.UTopicSubject = keyof Streams.UTopicSubject,
  > = {
    id: string;
    topic: TUnifiedTopic;
    innerTopic: TUnifiedInnerTopic[TUnifiedTopic];
    innerSubject: Streams.UTopicSubject[TUnifiedTopic];
  };

  /**
   * Type representing the events that can occur over the websocket.
   * @template WebsocketMessage - The websocket message type.
   */
  export type Events<WebsocketMessage extends Exchange.Topic> = {
    [Event.SUBSCRIBE]: [{ subjects: string[]; topic: Topic; success: boolean; error?: any }];
    [Event.UNSUBSCRIBE]: [{ subjects: string[]; topic: Topic; success: boolean; error?: any }];
    [Event.UPDATE]: [
      {
        [Topic in keyof WebsocketMessage]: {
          topic: Topic;
          message: WebsocketMessage[Topic];
        };
      }[keyof WebsocketMessage],
    ];
  };

  // Message types
  /**
   * Type representing a request sent over the websocket.
   * @template TData - The type of the data in the request.
   */
  export type Request<TData = any> = {
    id: string;
    websocketId: string;
    type: Action;
    data: TData;
  };

  /**
   * Type representing a connection over the websocket.
   * @template TPing - The type of the ping message.
   * @template TPong - The type of the pong message.
   * @template TChannel - The type of the channel.
   */
  export type Connection<TPing = any, TPong = any, TChannel = any> = {
    id: string;
    websocket: WebsocketClass<TPing, TPong>;
    channel: TChannel;
    streamCount: number;
    isAuthenticated: boolean;
  };

  /**
   * Type representing a stream associated with a connection.
   */
  export type ConnectionStream = {
    id: string;
    websocketId: string;
    requests?: {
      subscribeId: string;
      subscribedAt?: number;
      subscribeRequestedAt: number;
      unsubscribeId?: string;
      unsubscribedAt?: number;
      unsubscribeRequestedAt?: number;
    };
    stream: Stream;
  };

  /**
   * Type representing a message event over the websocket.
   */
  export type MessageEvent = {
    [Event in keyof Events<any>]: {
      event: Event;
      topicUnified: Topic;
      data: Events<any>[Event][0];
    };
  }[keyof Events<any>];

  /**
   * Type representing an action message over the websocket.
   * - PING/PONG: Action for ping/pong messages.
   * - SUBSCRIBE/UNSUBSCRIBE: Action for subscription/unsubscription messages.
   */
  export type MessageAction =
    | {
        action: Action.PING | Action.PONG;
        success: boolean;
        error?: any;
      }
    | {
        action: Action.SUBSCRIBE | Action.UNSUBSCRIBE;
        subjects: string[];
        topic: Topic;
        success: boolean;
        error?: any;
      };

  /**
   * Type representing a payload message over the websocket.
   * @template TPayload - The type of the payload.
   */
  export type MessagePayload<TPayload> = {
    requestId: string;
    message: TPayload;
    streams: Stream[];
    type: Action;
  };

  /**
   * Type representing a payload messages over the websocket.
   * @template TPayload - The type of the payload.
   */
  export type MessagePayloads<TPayload> = Array<MessagePayload<TPayload>>;

  /**
   * Type representing the context of a message over the websocket.
   * @template TInnerTopic - The type of the inner topic.
   */
  export type MessageContext<TInnerTopic extends string> = {
    possibleMessageTypes: Array<Action | Topic>;
    requestId?: string;
    topic?: TInnerTopic;
    subjects?: string[];
    success: boolean;
    error?: string;
  };

  // Configuration types
  /**
   * Type representing the options for creating a websocket connection.
   * - isPingingFrames: Whether to ping frames.
   * - pingInitiator: The initiator of the ping.
   * - pingInterval: The interval between pings.
   * - websocketsLimit: The limit on the number of websockets.
   * - streamsLimit: The limit on the number of streams.
   * - lifetime: The lifetime of the websocket.
   * - timeout: The timeout for the websocket.
   */
  export type CreateOptions = {
    isPingingFrames?: boolean;
    pingInitiator?: WebsocketSides;
    pingInterval?: number;
    websocketsLimit?: number;
    streamsLimit?: number;
    lifetime?: number;
    timeout?: number;
  };
}

/**
 * Re-exporting Topic from the handlers types.
 */
export { Topic } from './base/handlers/types';
