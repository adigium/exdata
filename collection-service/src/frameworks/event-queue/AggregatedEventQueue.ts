import { EventQueue } from './EventQueue';

export class AggregatedEventQueue<EventMessage> {
  eventQueues: Map<string, EventQueue<EventMessage>>;

  constructor(private processEvent: (subject: string, event: EventMessage) => Promise<boolean>) {
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

  getBufferedEventsCount(subject: string) {
    const eventQueue = this.getEventQueue(subject);

    return eventQueue.getQueue().length;
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

    eventQueue.start();

    return this;
  }

  stop(subject?: string) {
    if (!subject) {
      this.eventQueues.forEach((eventQueue) => eventQueue.stop());
      this.eventQueues = new Map();
      return this;
    }

    const eventQueue = this.getEventQueue(subject);

    eventQueue.stop();

    return this;
  }

  private getEventQueue(subject: string) {
    let eventQueue = this.eventQueues.get(subject);

    if (!eventQueue) {
      eventQueue = new EventQueue<EventMessage>((event) => this.processEvent(subject, event));
      this.eventQueues.set(subject, eventQueue);
    }

    return eventQueue;
  }
}
