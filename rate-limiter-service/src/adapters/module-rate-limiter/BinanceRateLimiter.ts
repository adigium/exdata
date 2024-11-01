import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { color, colors, ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTracker, RateLimitTrackerBuilder, RequestDetails } from '@frameworks/rate-limiter';
import { DI } from '@di';
import { ConfigurationService } from '@services/ConfigurationService';

enum BinanceTrackers {
  API_WEIGHT = 'api-weight',
  ORDERS_COUNT = 'orders-count',
  REQUESTS_COUNT = 'requests-count',
  SAPI_IP_WEIGHT = 'sapi-ip-weight',
  SAPI_UID_WEIGHT = 'sapi-uid-weight',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

const DEFAULT_LIMITS = {
  API: { '1M': 6000 },
  SAPI: {
    IP: { '1M': 12000 },
    UID: { '1M': 180000 },
  },
  orders: { '10S': 100, '1D': 200000 },
  requests: { '5M': 61000 },
  websocket: { connect: { '5M': 300 }, send: { '1S': 3 } },
};

@injectable()
export class BinanceRateLimiter extends BaseRateLimiter<ExchangeRequestContext.Binance> {
  logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BinanceRateLimiter');

    const weightLimitsApi = this.mapIntervalLimits(DEFAULT_LIMITS.API);
    const orderLimits = this.mapIntervalLimits(DEFAULT_LIMITS.orders);
    const requestLimits = this.mapIntervalLimits(DEFAULT_LIMITS.requests);

    const weightIpLimitsSapi = this.mapIntervalLimits(DEFAULT_LIMITS.SAPI.IP);
    const weightUidLimitsSapi = this.mapIntervalLimits(DEFAULT_LIMITS.SAPI.UID);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const weightTrackerApi = RateLimitTrackerBuilder.create()
      .addEndpointGroupLayer('/api/')
      .addIpLayer()
      .addIdLayer(this.configuration.BINANCE_UID)
      .addIntervalLimits(weightLimitsApi)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.API_WEIGHT, weightTrackerApi);

    const ordersTrackerApi = RateLimitTrackerBuilder.create()
      .useCountType()
      .addConditionLayer<ExchangeRequestContext.Binance>((request) => request.isOrder || false)
      .addIntervalLimits(orderLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.ORDERS_COUNT, ordersTrackerApi);

    const requestsTrackerApi = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIntervalLimits(requestLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.REQUESTS_COUNT, requestsTrackerApi);

    const weightIpTrackerSapi = RateLimitTrackerBuilder.create()
      .addIpLayer()
      .addEndpointGroupLayer('/sapi/')
      .addEndpointTargetLayer()
      .addIntervalLimits(weightIpLimitsSapi)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.SAPI_IP_WEIGHT, weightIpTrackerSapi);

    const weightUidTrackerSapi = RateLimitTrackerBuilder.create()
      .addIdLayer(this.configuration.BINANCE_UID)
      .addEndpointGroupLayer('/sapi/')
      .addEndpointTargetLayer()
      .addIntervalLimits(weightUidLimitsSapi)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.SAPI_UID_WEIGHT, weightUidTrackerSapi);

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect')
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send')
      .addEndpointTargetLayer()
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BinanceTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }

  updateUsageFromHeaders(props: {
    headers: Record<string, string>;
    requestDetails: RequestDetails<ExchangeRequestContext.Binance>;
    timestamp: number;
  }) {
    const { headers, requestDetails, timestamp } = props;

    this.logger.info('Updating usage of rate limits by headers...');

    for (const [header, value] of Object.entries(headers)) {
      let tracker: RateLimitTracker<ExchangeRequestContext.Binance> | undefined;

      let intervalNum: string | undefined;
      let intervalLetter: string | undefined;

      const apiWeightUsed = header.toUpperCase().match(/^X-MBX-USED-WEIGHT-(\d+)([SMHD])$/);
      const apiOrdersUsed = header.toUpperCase().match(/^X-MBX-ORDER-COUNT-(\d+)([SMHD])$/);
      const sapiIpWeightUsed = header.toUpperCase().match(/^X-SAPI-USED-IP-WEIGHT-(\d+)([SMHD])$/);
      const sapiUidWeightUsed = header.toUpperCase().match(/^X-SAPI-USED-UID-WEIGHT-(\d+)([SMHD])$/);

      if (apiWeightUsed) {
        [, intervalNum, intervalLetter] = apiWeightUsed;

        this.logger.info(
          `(${color(BinanceTrackers.API_WEIGHT, colors.customPink)}) Updating tracker usage of rate limits by headers ${intervalNum}${intervalLetter} = ${value}`,
        );

        tracker = this.getTracker(BinanceTrackers.API_WEIGHT);
        if (!tracker || !intervalNum || !intervalLetter) continue;
        tracker.updateUsage(
          requestDetails,
          +value,
          [this.getIntervalDuration(+intervalNum, intervalLetter)],
          timestamp,
        );
      }

      if (apiOrdersUsed) {
        [, intervalNum, intervalLetter] = apiOrdersUsed;

        this.logger.info(
          `(${color(BinanceTrackers.ORDERS_COUNT, colors.customPink)}) Updating tracker usage of rate limits by headers ${intervalNum}${intervalLetter} = ${value}`,
        );

        tracker = this.getTracker(BinanceTrackers.ORDERS_COUNT);
        if (!tracker || !intervalNum || !intervalLetter) continue;
        tracker.updateUsage(requestDetails, +value, [this.getIntervalDuration(+intervalNum, intervalLetter)]);
      }

      if (sapiIpWeightUsed) {
        [, intervalNum, intervalLetter] = sapiIpWeightUsed;

        this.logger.info(
          `(${color(BinanceTrackers.SAPI_IP_WEIGHT, colors.customPink)}) Updating tracker usage of rate limits by headers ${intervalNum}${intervalLetter} = ${value}`,
        );

        tracker = this.getTracker(BinanceTrackers.SAPI_IP_WEIGHT);
        if (!tracker || !intervalNum || !intervalLetter) continue;
        tracker.updateUsage(
          requestDetails,
          +value,
          [this.getIntervalDuration(+intervalNum, intervalLetter)],
          timestamp,
        );
      }

      if (sapiUidWeightUsed) {
        [, intervalNum, intervalLetter] = sapiUidWeightUsed;

        this.logger.info(
          `(${color(BinanceTrackers.SAPI_UID_WEIGHT, colors.customPink)}) Updating tracker usage of rate limits by headers ${intervalNum}${intervalLetter} = ${value}`,
        );

        tracker = this.getTracker(BinanceTrackers.SAPI_UID_WEIGHT);
        if (!tracker || !intervalNum || !intervalLetter) continue;
        tracker.updateUsage(
          requestDetails,
          +value,
          [this.getIntervalDuration(+intervalNum, intervalLetter)],
          timestamp,
        );
      }
    }
  }
}
