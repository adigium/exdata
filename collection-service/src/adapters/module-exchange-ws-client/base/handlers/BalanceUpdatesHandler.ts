import { ExchangeAssetBalance } from '@entities';
import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
  WebsocketScoped,
} from '@adapters/module-exchange-ws-client/interfaces';
import { MemoryCache } from '@frameworks/memory-cache';
import { RequestService } from '@services/utility';
import { Websocket } from '../../types';
import { BalanceUpdatesQueue } from './BalanceUpdatesQueue';
import { BalanceUpdatesSpecification } from './BalanceUpdatesSpecification';
import { TopicHandler } from './TopicHandler';
import { TopicRelated } from './TopicRelated';

export class BalanceUpdatesHandler<TWebsocketMessages extends Websocket.Exchange.Topic>
  implements WebsocketScoped, TopicRelated<TWebsocketMessages>, TopicHandler<TWebsocketMessages>
{
  public topic: Websocket.Topic.BALANCE_UPDATES = Websocket.Topic.BALANCE_UPDATES;
  public specification: BalanceUpdatesSpecification<TWebsocketMessages>;

  private balancesCache: MemoryCache<string, ExchangeAssetBalance>;

  private queue: BalanceUpdatesQueue<TWebsocketMessages>;

  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
  ) {
    this.specification = this.websocket.specification.topicSpecification[this.topic];

    this.balancesCache = new MemoryCache();

    this.queue = new BalanceUpdatesQueue(this.application, this.exchange, this.websocket, this.balancesCache);
  }

  public async handleSubscribe() {
    const { database, rateLimiter } = this.application;
    const { id, clientApi, mapper } = this.exchange;
    const { logger } = this.websocket;

    const handleError = (error: string) => logger.error(`Error on fetch balances: ${error}`);

    try {
      const balancesResponse = await RequestService.with({
        exchangeId: id,
        rateLimiter,
        logger,
      }).request(clientApi.fetchBalances, {
        context: 'Fetch Balances',
        onError: handleError,
      });

      if (!balancesResponse) throw new Error('No response from balances request');

      const { exchangeAssetBalances } = mapper.mapBalances(balancesResponse);

      if (!exchangeAssetBalances || exchangeAssetBalances.length === 0) {
        throw new Error(`Failed to fetch balances, since there's empty response from the mapper`);
      }

      exchangeAssetBalances.forEach((balance) => this.balancesCache.set(balance._id, balance));

      this.queue.start();

      database.saveExchangeAssetBalances(exchangeAssetBalances);
    } catch (e: any) {
      logger.error(`Failed to handle subscription success; Reason: ${e.message}`);
    }
  }

  public async handleUnsubscribe(): Promise<void> {
    const { logger } = this.websocket;

    logger.warn(`No unsub event`);
  }

  public async handleUpdate(message: TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]) {
    const { logger } = this.websocket;

    try {
      this.queue.enqueue(message);
    } catch (e: any) {
      logger.error(`Failed to enqueue depth update; Reason: ${e.message}`);
    }
  }
}
