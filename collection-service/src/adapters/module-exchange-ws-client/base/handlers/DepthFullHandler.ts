import { OrderBook } from '@entities';
import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
  WebsocketScoped,
} from '@adapters/module-exchange-ws-client/interfaces';
import { MemoryCache } from '@frameworks/memory-cache';
import { RequestService } from '@services/utility';
import { Websocket } from '../../types';
import { DepthFullQueue } from './DepthFullQueue';
import { DepthFullSpecification } from './DepthFullSpecification';
import { TopicHandler } from './TopicHandler';
import { TopicRelated } from './TopicRelated';

export class DepthFullHandler<TWebsocketMessages extends Websocket.Exchange.Topic>
  implements WebsocketScoped, TopicRelated<TWebsocketMessages>, TopicHandler<TWebsocketMessages>
{
  public topic: Websocket.Topic.DEPTH_FULL = Websocket.Topic.DEPTH_FULL;
  public specification: DepthFullSpecification<TWebsocketMessages>;

  protected queue: DepthFullQueue<TWebsocketMessages>;

  protected booksMemoryCache: MemoryCache<string, OrderBook>;
  protected symbolsInnerUnifiedMap: MemoryCache<string, string>;
  protected symbolsUnifiedInnerMap: MemoryCache<string, string>;

  protected orderBookSnapshotLevel: number | undefined;

  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
  ) {
    this.specification = this.websocket.specification.topicSpecification[this.topic];

    this.booksMemoryCache = new MemoryCache();
    this.symbolsInnerUnifiedMap = new MemoryCache();
    this.symbolsUnifiedInnerMap = new MemoryCache();

    this.queue = new DepthFullQueue(
      this.application,
      this.exchange,
      this.websocket,
      this.booksMemoryCache,
      this.symbolsInnerUnifiedMap,
      this.symbolsUnifiedInnerMap,
    );
  }

  public async handleSubscribe(subjects: string[]) {
    const { database, rateLimiter } = this.application;
    const { id, clientApi, clientWs, mapper } = this.exchange;
    const { logger } = this.websocket;

    try {
      const innerSymbols = subjects;

      const {
        success: marketsSuccess,
        data: markets,
        error: marketsError,
      } = await database.getMarketSymbolsBySymbolsInner(id, innerSymbols);

      if (!marketsSuccess || !markets || !!marketsError) {
        clientWs.unsubscribe({ topic: this.topic, symbols: innerSymbols });
        logger.error(`Fetching markets symbols by inner symbols failed: ${marketsError}`);
        return;
      }

      markets.forEach((market) => {
        this.symbolsInnerUnifiedMap.set(market.symbolInner.toLowerCase(), market.symbolUnified);
        this.symbolsUnifiedInnerMap.set(market.symbolUnified.toLowerCase(), market.symbolInner);
      });

      if (innerSymbols.length !== markets.length)
        logger.error(`Could not find all trading pairs to provided inner symbols`);

      await database.deleteOrderBooks(markets.map((market) => market._id));

      const onError = (error: string) => logger.error(`Error on fetch order book: ${error}`);

      markets.forEach(async (market) => {
        const orderBookResponse = await RequestService.with({
          exchangeId: id,
          rateLimiter,
          logger,
        }).request(clientApi.fetchOrderBook, {
          args: [market.symbolUnified, this.orderBookSnapshotLevel],
          context: 'Fetch Order Book',
          onError,
        });

        if (!orderBookResponse) return;

        const { orderBooks } = mapper.mapOrderBooks([orderBookResponse]);

        if (!orderBooks || orderBooks.length === 0) {
          logger.error(
            `Failed to fetch ${market.symbolUnified} order book, since there's empty response from the mapper`,
          );
          return;
        }

        orderBooks.forEach((orderBook) => this.booksMemoryCache.set(orderBook._id, orderBook));

        this.startProcessing([market.symbolInner.toLowerCase()]);

        database.saveOrderBooks(orderBooks);
      });
    } catch (e: any) {
      logger.error(
        `Failed to handle subscription success for the depth updates for: ${JSON.stringify(subjects)}; Reason: ${e.message}`,
      );
    }
  }

  public async handleUnsubscribe(): Promise<void> {
    const { logger } = this.websocket;

    logger.warn(`No unsub event`);
  }

  public async handleUpdate(message: TWebsocketMessages[Websocket.Topic.DEPTH_FULL]) {
    const { logger } = this.websocket;

    try {
      const subjects = this.specification.getDepthSubjects(message);
      if (!subjects) {
        logger.error(`Failed to get a subject for message: ${JSON.stringify(message, null, 2)}`);
        return;
      }

      for (const subject of subjects) {
        this.queue.enqueue(subject.toLowerCase(), message);
      }
    } catch (e: any) {
      logger.error(`Failed to enqueue depth update; Reason: ${e.message}`);
    }
  }

  private async startProcessing(subjects: string[]) {
    for (const subject of subjects) {
      this.queue.start(subject.toLowerCase());
    }
  }
}
