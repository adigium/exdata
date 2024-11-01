import { Emitter } from 'strict-event-emitter';
import { TaskType } from '@entities';
import { ExchangeID } from '@entities/exchangeId';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import {
  ExchangeClientModule,
  ExchangeMapperModule,
  ExchangeServiceModule,
  ExchangeServiceModuleEvents,
  ExchangeWebsocketModule,
  HttpClientModule,
  LoggerModule,
  RateLimiterModule,
} from '@modules';
import { Websocket } from '@adapters/module-exchange-ws-client/types';
import { ConfigurationService } from '@services/core';
import { RequestService, SaverService } from '@services/utility';

enum TaskStatus {
  STARTED = 'started',
  STOPPED = 'stopped',
}

const FALLBACK_INTERVAL_MS = 5000;

// TODO: Think of better task lifecycle management
export abstract class BaseExchangeService<RequestContext>
  extends Emitter<ExchangeServiceModuleEvents>
  implements ExchangeServiceModule
{
  abstract exchangeId: ExchangeID;
  abstract rateLimiter: RateLimiterModule;
  abstract logger: LoggerModule;

  protected abstract configuration: ConfigurationService;
  protected abstract settings: SettingsRepository;
  protected abstract database: DatabaseRepository;
  protected abstract httpClient: HttpClientModule;
  protected abstract exchangeClient: ExchangeClientModule<RequestContext>;
  protected abstract websocketClient: ExchangeWebsocketModule;
  protected abstract exchangeMapper: ExchangeMapperModule;

  protected taskProcesses: Map<TaskType, NodeJS.Timeout>;
  protected taskStatus: Map<TaskType, TaskStatus>;
  protected taskIntervals: Map<TaskType, number>;

  protected defaultInterval: number = FALLBACK_INTERVAL_MS;
  protected isInitialized: boolean = false;
  protected isInitializing: boolean = false;

  constructor() {
    super();

    this.taskProcesses = new Map<TaskType, NodeJS.Timeout>();
    this.taskStatus = new Map<TaskType, TaskStatus>();
    this.taskIntervals = new Map<TaskType, number>();
  }

  public getId(): ExchangeID {
    return this.exchangeId;
  }

  /******************************************************************************************
   *  Public Management
   ******************************************************************************************/

  public async start() {
    this.isInitializing = true;

    const { collectionServiceTaskIntervalMs } = await this.settings.current();

    this.defaultInterval = collectionServiceTaskIntervalMs;

    this.taskProcesses.forEach((_, task) => this.stopTask(task));
    this.taskProcesses = new Map<TaskType, NodeJS.Timeout>();
    this.taskStatus = new Map<TaskType, TaskStatus>();
    this.taskIntervals = new Map<TaskType, number>();

    await this.exchangeClient.initialize();
    await this.initialize();

    await this.websocketClient.open();

    this.isInitialized = true;
    this.isInitializing = false;
  }

  public async stop() {
    this.taskProcesses.forEach((_, task) => this.stopTask(task));
    this.taskProcesses = new Map();
    this.taskIntervals = new Map();

    await this.websocketClient.close();
  }

  public async registerTask(task: TaskType) {
    let taskProcess: (() => Promise<void>) | undefined;

    if (task === TaskType.FETCH_CURRENCIES) {
      taskProcess = this.processCurrencies.bind(this);
    } else if (task === TaskType.FETCH_MARKETS) {
      taskProcess = this.processMarkets.bind(this);
    } else if (task === TaskType.FETCH_ORDER_BOOKS) {
      taskProcess = this.processOrderBooks.bind(this);
    } else if (task === TaskType.FETCH_DEPOSIT_WITHDRAW_FEES) {
      taskProcess = this.processDepositWithdrawFees.bind(this);
    }

    if (!taskProcess) throw new Error('Unsupported task type');

    await this.startTask(task, taskProcess);
  }

  public async deregisterTask(task: TaskType) {
    await this.stopTask(task);
  }

  /******************************************************************************************
   *  Task Intervals
   ******************************************************************************************/

  public setTaskInterval(interval: number, task?: TaskType) {
    if (task) {
      this.taskIntervals.set(task, interval);
      return;
    }
    this.defaultInterval = interval;
  }

  public deleteTaskInterval(task: TaskType) {
    this.taskIntervals.delete(task);
  }

  /******************************************************************************************
   *  Tasks
   ******************************************************************************************/

  protected async processCurrencies() {
    const currencies = await RequestService.with(this).request(this.exchangeClient.fetchCurrencies, {
      context: 'Fetch Currencies',
      onError: (e) => this.logger.error(`Request fetch-currencies failed: ${e.message}`),
    });

    if (!currencies) throw new Error('Failed to fetch currencies');

    const dataCurrencies = this.exchangeMapper.mapCurrencies(currencies);
    const dataNetworks = this.exchangeMapper.mapCurrenciesNetworks(currencies);

    const savingResult = await SaverService.save(this.database, { ...dataCurrencies, ...dataNetworks });

    if (!savingResult.success) this.logger.error(`fetch-currencies: Saving failed: ${savingResult.error}`);
  }

  protected async processMarkets() {
    const markets = await RequestService.with(this).request(this.exchangeClient.fetchMarkets, {
      context: 'Fetch Markets',
      onError: (e) => this.logger.error(`Request fetch-markets failed: ${e.message}`),
    });

    if (!markets) throw new Error('Failed to fetch markets');

    const data = this.exchangeMapper.mapMarkets(markets);

    const savingResult = await SaverService.save(this.database, data);

    if (!savingResult.success) this.logger.error(`fetch-markets: Saving failed: ${savingResult.error}`);
  }

  protected async processOrderBooks() {
    const {
      success: symbolsInnerSuccess,
      data: symbolsInner,
      error: symbolsInnerError,
    } = await this.database.getMarketsActiveInnerSymbols(this.getId());

    if (!symbolsInnerSuccess || !symbolsInner || symbolsInnerError) {
      this.logger.error(`Failed to get active markets from database: ${symbolsInnerError}`);
      return;
    }

    if (symbolsInner.length === 0) return;

    await this.websocketClient.subscribe({ symbols: symbolsInner, topic: Websocket.Topic.DEPTH_LIGHT });
  }

  protected async processDepositWithdrawFees() {
    const depositWithdrawFees = await RequestService.with(this).request(
      this.exchangeClient.fetchDepositWithdrawFees,
      {
        context: 'Fetch Fees',
        onError: (e) => this.logger.error(`Request fetch-deposit-withdraw-fees failed: ${e.message}`),
      },
    );

    if (!depositWithdrawFees) throw new Error('Failed to fetch deposit and withdraw fees');

    const data = this.exchangeMapper.mapDepositWithdrawNetworks(depositWithdrawFees);

    const savingResult = await SaverService.save(this.database, data);

    if (!savingResult.success)
      this.logger.error(`fetch-deposit-withdraw-fees: Saving failed: ${savingResult.error}`);
  }

  /******************************************************************************************
   *  Task Controls
   ******************************************************************************************/

  private async startTask(task: TaskType, func: () => Promise<void>) {
    const run = (async () => {
      if (this.isInitialized && this.isTaskStarted(task)) {
        const startedAt = Date.now();

        try {
          await func();

          this.emit('task-done', {
            exchange: this.getId(),
            task,
            status: 'success',
            startedAt,
            completedAt: Date.now(),
          });
        } catch (error: any) {
          this.logger.error(`Error executing ${task}: ${error.message} \n${(error as Error).stack}`);

          this.emit('task-done', {
            exchange: this.getId(),
            task,
            status: 'failed',
            startedAt,
            completedAt: Date.now(),
            errorMessage: error.message,
          });
        }
      }

      if (this.isTaskStarted(task))
        this.setTaskStarted(task, setTimeout(run, this.taskIntervals.get(task) || this.defaultInterval));
    }).bind(this);

    this.setTaskStarted(task, setTimeout(run, 0));
  }

  private async stopTask(task: TaskType) {
    if (task === TaskType.FETCH_ORDER_BOOKS) {
      this.websocketClient.close();
    }

    const process = this.taskProcesses.get(task);

    if (!process) return;

    clearTimeout(process);

    this.setTaskStopped(task);
  }

  /******************************************************************************************
   *  Utility Methods
   ******************************************************************************************/

  private setTaskStarted(task: TaskType, process: NodeJS.Timeout) {
    this.taskProcesses.set(task, process);
    this.taskStatus.set(task, TaskStatus.STARTED);
  }

  private setTaskStopped(task: TaskType) {
    this.taskProcesses.delete(task);
    this.taskStatus.set(task, TaskStatus.STOPPED);
  }

  private isTaskStarted(task: TaskType) {
    return !!this.taskProcesses.get(task) && this.taskStatus.get(task) === TaskStatus.STARTED;
  }

  /******************************************************************************************
   *  Exchange-specific Methods
   ******************************************************************************************/

  protected abstract initialize(): Promise<any>;
}
