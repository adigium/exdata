import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTrackerBuilder } from '@frameworks/rate-limiter';
import { DI } from '@di';
import { ConfigurationService } from '@services/ConfigurationService';

enum KucoinTrackers {
  MANAGEMENT_UID_WEIGHT = 'management-uid-weight',
  PUBLIC_IP_WEIGHT = 'public-ip-weight',
  SPOT_UID_WEIGHT = 'spot-uid-weight',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

enum RequestTypeEnum {
  MANAGEMENT = 'management',
  PUBLIC = 'public',
  SPOT = 'spot',
}

const DEFAULT_LIMITS = {
  [RequestTypeEnum.SPOT]: { '30S': 4000 },
  [RequestTypeEnum.MANAGEMENT]: { '30S': 2000 },
  [RequestTypeEnum.PUBLIC]: { '30S': 2000 },
  websocket: { connect: { '1M': 30 }, send: { '10S': 100 } },
};

@injectable()
export class KucoinRateLimiter extends BaseRateLimiter<ExchangeRequestContext.Kucoin<RequestTypeEnum>> {
  logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'KucoinRateLimiter');

    const managementLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.MANAGEMENT]);
    const spotLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.SPOT]);
    const publicLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PUBLIC]);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const managementUidWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIdLayer(this.configuration.KUCOIN_UID)
      .addConditionLayer<ExchangeRequestContext.Kucoin<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.MANAGEMENT,
      )
      .addIntervalLimits(managementLimits)
      .build();
    this.addTracker(KucoinTrackers.MANAGEMENT_UID_WEIGHT, managementUidWeight);

    const spotUidWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIdLayer(this.configuration.KUCOIN_UID)
      .addConditionLayer<ExchangeRequestContext.Kucoin<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.SPOT,
      )
      .addIntervalLimits(spotLimits)
      .build();
    this.addTracker(KucoinTrackers.SPOT_UID_WEIGHT, spotUidWeight);

    const publicIdWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIpLayer()
      .addConditionLayer<ExchangeRequestContext.Kucoin<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.SPOT,
      )
      .addIntervalLimits(publicLimits)
      .build();
    this.addTracker(KucoinTrackers.PUBLIC_IP_WEIGHT, publicIdWeight);

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect')
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(KucoinTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send')
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(KucoinTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }
}
