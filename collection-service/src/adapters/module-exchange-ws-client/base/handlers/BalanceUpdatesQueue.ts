import { debounce } from 'lodash';
import { ExchangeAssetBalance } from '@entities';
import { EventQueue } from '@frameworks/event-queue';
import { MemoryCache } from '@frameworks/memory-cache';
import { IdentifierService } from '@services/utility';
import { ApplicationScope, ExchangeScope, WebsocketScope, WebsocketScoped } from '../../interfaces';
import { Websocket } from '../../types';
import { BalanceUpdatesSpecification } from './BalanceUpdatesSpecification';
import { TopicRelated } from './TopicRelated';

export class BalanceUpdatesQueue<TWebsocketMessages extends Websocket.Exchange.Topic>
  implements WebsocketScoped, TopicRelated<TWebsocketMessages>
{
  public topic: Websocket.Topic.BALANCE_UPDATES = Websocket.Topic.BALANCE_UPDATES;
  public specification: BalanceUpdatesSpecification<TWebsocketMessages>;

  private queue: EventQueue<TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]>;

  private syncDebounceDelayMs: number = Websocket.Constants.BALANCE_DEFAULT_SYNC_DEBOUNCE_DELAY_MS;

  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
    private balancesCache: MemoryCache<string, ExchangeAssetBalance>,
  ) {
    this.specification = this.websocket.specification.topicSpecification[this.topic];

    this.queue = new EventQueue<TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]>(
      this.handleQueueMessage.bind(this),
    );

    this.application.settings.current().then((settings) => {
      const { balancesSyncDebounceDelayMs } = settings;
      this.syncDebounceDelayMs = balancesSyncDebounceDelayMs;
      this.synchronize = debounce(this._synchronize.bind(this), this.syncDebounceDelayMs);
    });
  }

  public start() {
    this.queue.start();
  }

  public enqueue(data: TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]) {
    this.queue.enqueue(data);
  }

  private async handleQueueMessage(data: TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]) {
    const isProcessed = await this.process(data);
    if (isProcessed) this.synchronize();
    return isProcessed;
  }

  private synchronize = debounce(this._synchronize.bind(this), this.syncDebounceDelayMs);

  private async _synchronize() {
    const { database } = this.application;
    const { logger } = this.websocket;

    try {
      const balances = Array.from(this.balancesCache.values());

      logger.info(
        `Synchronizing ${balances.length} balances with persistent storage from the memory cache...`,
      );

      const savingResult = await database.saveExchangeAssetBalances(
        balances.map((balance) => ({ ...balance, synchronizedAt: Date.now() })),
      );

      if (!savingResult.success) logger.error('Persistent storage synchronization failed');
    } catch (e: any) {
      logger.error(`Failed to synchronize the storage; Reason: ${e.message}`);
    }
  }

  private async process(data: TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]): Promise<boolean> {
    const { settings } = this.application;
    const { id, clientWs } = this.exchange;
    const { logger } = this.websocket;

    try {
      const { balancesLatencySavingBound } = await settings.current();

      const mappedData = this.specification.mapBalanceData(data);

      return mappedData.reduce((prevResult, dataRecord) => {
        const { timestamp, accountType, assetInner, free, used, total, isSnapshot } = dataRecord;

        const assetUnified = this.exchange.clientApi.assetInnerToUnified(assetInner);

        const bufferedEvents = this.queue.getBufferedEventsCount() || 0;

        if (bufferedEvents >= balancesLatencySavingBound) {
          // TODO: What to do then? Handle this case
        }

        const cacheKey = IdentifierService.getExchangeAssetBalanceId(id, assetUnified, accountType);

        const storedBalance = this.balancesCache.get(cacheKey);

        if (isSnapshot) {
          if (storedBalance && storedBalance.timestamp > timestamp) return prevResult && true;

          this.balancesCache.set(cacheKey, {
            _id: cacheKey,
            exchangeId: id,
            exchangeAssetId: IdentifierService.getExchangeAssetId(id, assetUnified),
            accountType,
            free,
            used,
            total,
            timestamp,
          });

          return prevResult && true;
        }

        if (!storedBalance) {
          logger.error(`No order book snapshot was found during processing the balance update`);
          this.queue.stop();
          this.queue.enqueueToBeNext(data);
          return prevResult && false;
        }

        if (storedBalance.timestamp > timestamp) {
          logger.error(`The event is not suitable for process: (${storedBalance.timestamp}, ${timestamp})`);
          this.queue.stop();
          this.balancesCache.delete(cacheKey);
          clientWs
            .unsubscribe({ topic: this.topic, symbols: [] })
            .then(() => clientWs.subscribe({ topic: this.topic, symbols: [] }));
          return prevResult && false;
        }

        storedBalance.free = (parseFloat(storedBalance.free) + parseFloat(free)).toString();
        storedBalance.used = (parseFloat(storedBalance.used) + parseFloat(used)).toString();
        storedBalance.total = (parseFloat(storedBalance.free) + parseFloat(storedBalance.used)).toString();
        storedBalance.timestamp = timestamp;

        return prevResult && true;
      }, true);
    } catch (e: any) {
      logger.error(`Failed to process depth update; Reason: ${e.message}`);
      return false;
    }
  }
}
