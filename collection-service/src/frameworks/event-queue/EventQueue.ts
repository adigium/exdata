import { Emitter } from 'strict-event-emitter';

export class EventQueue<EventMessage> extends Emitter<{
  enqueue: [];
}> {
  private queue: EventMessage[] = [];
  private isProcessing = false;
  private isStarted = false;
  processedCount = 0;

  constructor(private processEvent: (event: EventMessage) => Promise<boolean>) {
    super();
    this.on('enqueue', this.processQueue);
    this.processQueue();
  }

  resetProcessedEventsCount() {
    this.processedCount = 0;

    return this;
  }

  getProcessedEventsCount() {
    return this.processedCount;
  }

  getBufferedEventsCount() {
    return this.queue.length;
  }

  start() {
    this.isStarted = true;
    this.processQueue();
  }

  stop() {
    this.isStarted = false;
  }

  enqueue(item: EventMessage) {
    this.queue.push(item);
    this.emit('enqueue');
  }

  enqueueToBeNext(item: EventMessage) {
    this.queue = [item, ...this.queue];
    this.emit('enqueue');
  }

  getQueue() {
    return this.queue;
  }

  private async processQueue() {
    if (!this.isStarted) return;

    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.isStarted) {
      const item = this.queue.shift();
      if (item) {
        const isProcessed = await this.processEvent(item);
        if (isProcessed) this.processedCount += 1;
      }
    }

    this.isProcessing = false;
  }
}
