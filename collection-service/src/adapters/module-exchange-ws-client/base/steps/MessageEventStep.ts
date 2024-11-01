import { Websocket } from '../../types';
import { WebsocketStep } from './WebsocketStep';

type Input = {
  websocketId: string;
  message: any;
  context: Websocket.MessageContext<any>;
  relatedRequests: Websocket.Request[];
  relatedEvents: Websocket.MessageAction[];
};

type Output = {
  events: Websocket.MessageEvent[];
};

export class MessageEventStep extends WebsocketStep<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const { message, context } = input;

    const events: Websocket.MessageEvent[] = [];

    const requestEvents = this.getRequestEvents(input);
    events.push(...requestEvents);

    if (context.possibleMessageTypes.includes(Websocket.Topic.DEPTH_FULL)) {
      events.push({
        event: Websocket.Event.UPDATE,
        topicUnified: Websocket.Topic.DEPTH_FULL,
        data: { message, topic: Websocket.Topic.DEPTH_FULL },
      });
    }
    if (context.possibleMessageTypes.includes(Websocket.Topic.DEPTH_LIGHT)) {
      events.push({
        event: Websocket.Event.UPDATE,
        topicUnified: Websocket.Topic.DEPTH_LIGHT,
        data: { message, topic: Websocket.Topic.DEPTH_LIGHT },
      });
    }
    if (context.possibleMessageTypes.includes(Websocket.Topic.BALANCE_UPDATES)) {
      events.push({
        event: Websocket.Event.UPDATE,
        topicUnified: Websocket.Topic.BALANCE_UPDATES,
        data: { message, topic: Websocket.Topic.BALANCE_UPDATES },
      });
    }

    return { events };
  }

  private getRequestEvents(input: Input) {
    const { relatedEvents } = input;

    const events: Websocket.MessageEvent[] = [];

    for (const event of relatedEvents) {
      if (!event.success) continue;

      if (event.action === Websocket.Action.PING || event.action === Websocket.Action.PONG) continue;

      if (event.action === Websocket.Action.SUBSCRIBE) {
        const { subjects, success, topic, error } = event;

        events.push({
          event: Websocket.Event.SUBSCRIBE,
          topicUnified: topic,
          data: {
            subjects,
            success,
            topic,
            error,
          },
        });
      }
      if (event.action === Websocket.Action.UNSUBSCRIBE) {
        const { subjects, success, topic, error } = event;

        events.push({
          event: Websocket.Event.UNSUBSCRIBE,
          topicUnified: topic,
          data: {
            subjects,
            success,
            topic,
            error,
          },
        });
      }
    }

    return events;
  }
}
