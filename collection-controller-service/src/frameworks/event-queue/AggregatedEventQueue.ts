import { EventQueue } from './EventQueue';

export class AggregatedEventQueue<EventMessage> {
  eventQueues: Map<string, EventQueue<EventMessage>>;

  constructor(private processEvent: (event: EventMessage) => Promise<boolean>) {
    this.eventQueues = new Map<string, EventQueue<EventMessage>>();
  }

  resetProcessedEventsCount(subject: string) {
    const eventQueue = this.getEventQueue(subject);

    eventQueue.processedCount = 0;

    return this;
  }

  getProcessedEventsCount(subject: string) {
    const eventQueue = this.getEventQueue(subject);

    return eventQueue.processedCount;
  }

  enqueue(subject: string, event: EventMessage) {
    const eventQueue = this.getEventQueue(subject);

    eventQueue.enqueue(event);

    return this;
  }

  enqueueToBeNext(subject: string, event: EventMessage) {
    const eventQueue = this.getEventQueue(subject);

    eventQueue.enqueueToBeNext(event);

    return this;
  }

  start(subject: string) {
    const eventQueue = this.getEventQueue(subject);

    eventQueue.startProcessing();

    return this;
  }

  stop(subject?: string) {
    if (!subject) {
      this.eventQueues.forEach((eventQueue) => eventQueue.stopProcessing());
      this.eventQueues = new Map();
      return this;
    }

    const eventQueue = this.getEventQueue(subject);

    eventQueue.stopProcessing();

    return this;
  }

  private getEventQueue(subject: string) {
    let eventQueue = this.eventQueues.get(subject);

    if (!eventQueue) {
      eventQueue = new EventQueue<EventMessage>(this.processEvent);
      this.eventQueues.set(subject, eventQueue);
    }

    return eventQueue;
  }
}
