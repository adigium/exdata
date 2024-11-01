import { injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTrackerBuilder } from '@frameworks/rate-limiter';

enum PoloniexTrackers {
  PRIVATE_HEAVY = 'private-heavy',
  PRIVATE_LIGHT = 'private-ligth',
  PUBLIC_10 = 'public-10',
  PUBLIC_200 = 'public-200',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

enum RequestTypeEnum {
  PRIVATE_HEAVY = 'private-heavy',
  PRIVATE_LIGHT = 'private-ligth',
  PUBLIC_10 = 'public-10',
  PUBLIC_200 = 'public-200',
}

const DEFAULT_LIMITS = {
  [RequestTypeEnum.PUBLIC_10]: { '1S': 10 },
  [RequestTypeEnum.PUBLIC_200]: { '1S': 200 },
  [RequestTypeEnum.PRIVATE_HEAVY]: { '1S': 10 },
  [RequestTypeEnum.PRIVATE_LIGHT]: { '1S': 50 },
  websocket: { connect: { '36500D': 2000 }, send: { '1S': 500 } },
};

@injectable()
export class PoloniexRateLimiter extends BaseRateLimiter<ExchangeRequestContext.Poloniex<RequestTypeEnum>> {
  logger: LoggerModule;

  constructor() {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'PoloniexRateLimiter');

    const publicTenLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PUBLIC_10]);
    const publicTwoHundredLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PUBLIC_200]);
    const privateLightLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PRIVATE_LIGHT]);
    const privateHeavyLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PRIVATE_HEAVY]);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const publicTenWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIpLayer()
      .addConditionLayer<ExchangeRequestContext.Poloniex<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.PUBLIC_10,
      )
      .addIntervalLimits(publicTenLimits)
      .build();
    this.addTracker(PoloniexTrackers.PUBLIC_10, publicTenWeight);

    const publicTwoHundredWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIpLayer()
      .addConditionLayer<ExchangeRequestContext.Poloniex<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.PUBLIC_200,
      )
      .addIntervalLimits(publicTwoHundredLimits)
      .build();
    this.addTracker(PoloniexTrackers.PUBLIC_200, publicTwoHundredWeight);

    const privateLightWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIpLayer()
      .addConditionLayer<ExchangeRequestContext.Poloniex<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.PRIVATE_LIGHT,
      )
      .addIntervalLimits(privateLightLimits)
      .build();
    this.addTracker(PoloniexTrackers.PRIVATE_LIGHT, privateLightWeight);

    const privateHeavyWeight = RateLimitTrackerBuilder.create()
      .useWeightType()
      .useFixedWindow()
      .addIpLayer()
      .addConditionLayer<ExchangeRequestContext.Poloniex<RequestTypeEnum>>(
        (request) => request.type === RequestTypeEnum.PRIVATE_HEAVY,
      )
      .addIntervalLimits(privateHeavyLimits)
      .build();
    this.addTracker(PoloniexTrackers.PRIVATE_HEAVY, privateHeavyWeight);

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect') // TODO: Move out to shared constant
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(PoloniexTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send') // TODO: Move out to shared constant
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(PoloniexTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }
}
