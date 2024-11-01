import { throttle } from 'lodash';
import { OrderBook } from '@entities';
import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
  WebsocketScoped,
} from '@adapters/module-exchange-ws-client/interfaces';
import { AggregatedEventQueue } from '@frameworks/event-queue';
import { MemoryCache } from '@frameworks/memory-cache';
import { IdentifierService } from '@services/utility';
import { Websocket } from '../../types';
import { DepthFullSpecification } from './DepthFullSpecification';
import { TopicRelated } from './TopicRelated';

export class DepthFullQueue<TWebsocketMessages extends Websocket.Exchange.Topic>
  implements WebsocketScoped, TopicRelated<TWebsocketMessages>
{
  public topic: Websocket.Topic.DEPTH_FULL = Websocket.Topic.DEPTH_FULL;
  public specification: DepthFullSpecification<TWebsocketMessages>;

  private queue: AggregatedEventQueue<TWebsocketMessages[Websocket.Topic.DEPTH_FULL]>;

  private syncThrottleIntervalMs: number = Websocket.Constants.DEPTH_DEFAULT_SYNC_THROTTLE_INTERVAL_MS;

  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
    private booksMemoryCache: MemoryCache<string, OrderBook>,
    private symbolsInnerUnifiedMap: MemoryCache<string, string>,
    private symbolsUnifiedInnerMap: MemoryCache<string, string>,
  ) {
    this.specification = this.websocket.specification.topicSpecification[this.topic];

    this.queue = new AggregatedEventQueue<TWebsocketMessages[Websocket.Topic.DEPTH_FULL]>(
      this.handleQueueMessage.bind(this),
    );

    this.application.settings.current().then((settings) => {
      const { orderBookSyncThrottleIntervalMs } = settings;
      this.syncThrottleIntervalMs = orderBookSyncThrottleIntervalMs;
      this.synchronize = throttle(this._synchronize.bind(this), this.syncThrottleIntervalMs);
    });
  }

  public start(subject: string) {
    this.queue.start(subject);
  }

  public enqueue(subject: string, data: TWebsocketMessages[Websocket.Topic.DEPTH_FULL]) {
    this.queue.enqueue(subject, data);
  }

  private async handleQueueMessage(subject: string, data: TWebsocketMessages[Websocket.Topic.DEPTH_FULL]) {
    const isProcessed = await this.process({ subject, data });
    if (isProcessed) this.synchronize();
    return isProcessed;
  }

  private synchronize = throttle(this._synchronize.bind(this), this.syncThrottleIntervalMs);

  private async _synchronize() {
    const { database, settings } = this.application;
    const { clientWs } = this.exchange;
    const { logger } = this.websocket;

    try {
      const { orderBookLatencySavingBound } = await settings.current();

      const activeStreams: [string, number][] = clientWs
        .getActiveStreams(this.topic)
        .filter((stream) => this.symbolsInnerUnifiedMap.has(stream.innerSubject.toLowerCase()))
        .map((stream) => [this.symbolsInnerUnifiedMap.get(stream.innerSubject.toLowerCase())!, 1]);

      const activeStreamsMap = new Map(activeStreams);

      const orderBooks = Array.from(this.booksMemoryCache.values()).filter(
        (orderBook) =>
          orderBook.latency < orderBookLatencySavingBound && activeStreamsMap.has(orderBook.symbolUnified),
      );

      logger.info(
        `Synchronizing ${orderBooks.length} order books (out of ${this.booksMemoryCache.size}) with persistent storage from the memory cache...`,
      );

      const savingResult = await database.saveOrderBooks(
        orderBooks.map((orderBook) => ({ ...orderBook, synchronizedAt: Date.now() })),
      );

      if (!savingResult.success) logger.error('Persistent storage synchronization failed');
    } catch (e: any) {
      logger.error(`Failed to synchronize the storage; Reason: ${e.message}`);
    }
  }

  private async process(props: {
    subject: string;
    data: TWebsocketMessages[Websocket.Topic.DEPTH_FULL];
  }): Promise<boolean> {
    const { settings } = this.application;
    const { id, clientWs } = this.exchange;
    const { logger } = this.websocket;

    try {
      const { subject: queueSubject, data } = props;

      const { orderBookLatencySavingBound } = await settings.current();

      const mappedData = this.specification.mapDepthData(data);

      return mappedData.reduce((prevResult, dataRecord) => {
        const { timestamp, symbolInner, finalUpdateId, startUpdateId, isSnapshot } = dataRecord;

        let asks: [price: string, amount: string][] | null = dataRecord.asks;
        let bids: [price: string, amount: string][] | null = dataRecord.bids;

        const subject = symbolInner.toLowerCase();

        if (queueSubject.toLowerCase() !== subject) return prevResult;

        const bufferedEvents = this.queue.getBufferedEventsCount(queueSubject) || 0;
        const processedEvents = this.queue.getProcessedEventsCount(queueSubject) || 0;

        if (bufferedEvents >= orderBookLatencySavingBound) {
          // TODO: What to do then? Handle this case
        }

        const symbolUnified = this.symbolsInnerUnifiedMap.get(subject);

        if (!symbolUnified) {
          logger.error(`No unified symbol was found in cache for: ${subject}`);
          return prevResult && false;
        }

        const cacheKey = IdentifierService.getOrderBookId(id, symbolUnified);

        if (isSnapshot) {
          this.booksMemoryCache.set(cacheKey, {
            _id: IdentifierService.getOrderBookId(id, symbolUnified),
            asks: asks.map((ask) => [+ask[0], +ask[1]]),
            bids: bids.map((bid) => [+bid[0], +bid[1]]),
            exchangeId: id,
            nonce: finalUpdateId,
            symbolUnified,
            symbolInner,
            timestamp,
            latency: bufferedEvents,
            synchronizedAt: Date.now(),
          });

          return prevResult && true;
        }

        const storedOrderBook = this.booksMemoryCache.get(cacheKey);
        if (!storedOrderBook) {
          logger.error(
            `No order book snapshot was found during processing the depth update for ${symbolUnified}`,
          );
          this.queue.stop(subject);
          this.queue.enqueueToBeNext(subject, data);
          return prevResult && false;
        }

        if (finalUpdateId <= storedOrderBook.nonce) return prevResult && false;

        const isLooselyProcessed =
          this.specification.isUpdateOrderLoose && finalUpdateId > storedOrderBook.nonce;
        const isFirstProcessedEvent =
          processedEvents === 0 &&
          startUpdateId <= storedOrderBook.nonce + 1 &&
          finalUpdateId >= storedOrderBook.nonce + 1;
        const isAllowedToProcess =
          startUpdateId ===
          (this.specification.isUpdateIntersecting ? storedOrderBook.nonce : storedOrderBook.nonce + 1);

        if (!isFirstProcessedEvent && !isAllowedToProcess && !isLooselyProcessed) {
          logger.error(
            `The event is not suitable for process: ${subject} (${startUpdateId}, ${finalUpdateId}, ${storedOrderBook.nonce})`,
          );
          this.queue.stop(subject);
          this.booksMemoryCache.delete(cacheKey);
          clientWs
            .unsubscribe({ topic: this.topic, symbols: [subject] })
            .then(() => clientWs.subscribe({ topic: Websocket.Topic.DEPTH_FULL, symbols: [subject] }));
          return prevResult && false;
        }

        this.updateOrderBook(storedOrderBook.asks, asks);
        asks = null;
        this.updateOrderBook(storedOrderBook.bids, bids);
        bids = null;

        storedOrderBook.nonce = finalUpdateId;
        storedOrderBook.timestamp = timestamp;
        storedOrderBook.latency = bufferedEvents;

        return prevResult && true;
      }, true);
    } catch (e: any) {
      logger.error(`Failed to process depth update; Reason: ${e.message}`);
      return false;
    }
  }

  private updateOrderBook = (
    original: [price: number, amount: number][],
    updates: [price: string, amount: string][],
  ) => {
    const bookMap = new Map(original);
    updates.forEach(([price, size]) => {
      const numericPrice = +price;
      const numericSize = +size;
      if (numericSize === 0) bookMap.delete(numericPrice);
      else bookMap.set(numericPrice, numericSize);
    });

    if (bookMap.size < original.length) {
      original.splice(bookMap.size, original.length - bookMap.size);
    }

    let index = 0;
    for (const [price, size] of bookMap) {
      if (index < original.length) {
        original[index] = [price, size];
      } else {
        original.push([price, size]);
      }
      index++;
    }

    bookMap.clear();
  };
}
