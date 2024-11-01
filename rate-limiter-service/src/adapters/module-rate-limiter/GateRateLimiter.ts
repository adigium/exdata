import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTrackerBuilder } from '@frameworks/rate-limiter';
import { DI } from '@di';
import { ConfigurationService } from '@services/ConfigurationService';

enum GateTrackers {
  DELIVERY = 'delivery',
  OPTIONS = 'options',
  OTHER = 'other',
  PERPETUALS = 'perpetuals',
  PUBLIC = 'public',
  SPOT = 'spot',
  SUBACCOUNT = 'subaccount',
  UNIFIED = 'unified',
  WALLET = 'wallet',
  WALLET_POST = 'wallet-post',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

enum RequestTypeEnum {
  DELIVERY = 'delivery',
  OPTIONS = 'options',
  OTHER = 'other',
  PERPETUALS = 'perpetuals',
  PUBLIC = 'public',
  SPOT = 'spot',
  SUBACCOUNT = 'subaccount',
  UNIFIED = 'unified',
  WALLET = 'wallet',
}

enum RequestMethodEnum {
  GET = 'get',
  POST = 'post',
}

const DEFAULT_LIMITS = {
  [RequestTypeEnum.PUBLIC]: { '10S': 200 },
  [RequestTypeEnum.WALLET]: { POST: { '3S': 1 }, GET: { '10S': 80 } },
  [RequestTypeEnum.SPOT]: { '1S': 10 },
  [RequestTypeEnum.PERPETUALS]: { '1S': 20 },
  [RequestTypeEnum.DELIVERY]: { '1S': 20 },
  [RequestTypeEnum.OPTIONS]: { '1S': 20 },
  [RequestTypeEnum.SUBACCOUNT]: { '10S': 80 },
  [RequestTypeEnum.UNIFIED]: { '10S': 15 },
  [RequestTypeEnum.OTHER]: { '10S': 150 },
  websocket: { connect: { '36500D': 365 }, send: { '1S': 500 } },
};

@injectable()
export class GateRateLimiter extends BaseRateLimiter<
  ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>
> {
  logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'GateRateLimiter');

    const publicLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PUBLIC]);
    const walletLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.WALLET].GET);
    const spotLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.SPOT]);
    // const walletPostLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.WALLET].POST);
    // const perpetualsLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.PERPETUALS]);
    // const deliveryLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.DELIVERY]);
    // const optionsLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.OPTIONS]);
    // const subaccountLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.SUBACCOUNT]);
    // const unifiedLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.UNIFIED]);
    // const otherLimits = this.mapIntervalLimits(DEFAULT_LIMITS[RequestTypeEnum.OTHER]);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const publicCount = RateLimitTrackerBuilder.create()
      .useCountType()
      .useFixedWindow()
      .addIpLayer()
      .addEndpointTargetLayer()
      .addConditionLayer<ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>>(
        (request) => request.type === RequestTypeEnum.PUBLIC,
      )
      .addIntervalLimits(publicLimits)
      .build();
    this.addTracker(GateTrackers.PUBLIC, publicCount);

    const spotCount = RateLimitTrackerBuilder.create()
      .useCountType()
      .useFixedWindow()
      .addIpLayer()
      .addEndpointTargetLayer()
      .addConditionLayer<ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>>(
        (request) => request.type === RequestTypeEnum.SPOT,
      )
      .addIntervalLimits(spotLimits)
      .build();
    this.addTracker(GateTrackers.SPOT, spotCount);

    const walletCount = RateLimitTrackerBuilder.create()
      .useCountType()
      .useFixedWindow()
      .addIdLayer(this.configuration.GATE_UID)
      .addEndpointTargetLayer()
      .addConditionLayer<ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>>(
        (request) => request.type === RequestTypeEnum.WALLET,
      )
      .addIntervalLimits(walletLimits)
      .build();
    this.addTracker(GateTrackers.WALLET, walletCount);

    const walletPostCount = RateLimitTrackerBuilder.create()
      .useCountType()
      .useFixedWindow()
      .addIdLayer(this.configuration.GATE_UID)
      .addEndpointTargetLayer()
      .addConditionLayer<ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>>(
        (request) => request.type === RequestTypeEnum.WALLET,
      )
      .addConditionLayer<ExchangeRequestContext.Gate<RequestTypeEnum, RequestMethodEnum>>(
        (request) => request.method === RequestMethodEnum.POST,
      )
      .addIntervalLimits(walletLimits)
      .build();
    this.addTracker(GateTrackers.WALLET_POST, walletPostCount);

    // TODO: Add other the rest of the limits, they are similar to wallet

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect') // TODO: Move out to shared constant
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(GateTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send') // TODO: Move out to shared constant
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(GateTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }
}
