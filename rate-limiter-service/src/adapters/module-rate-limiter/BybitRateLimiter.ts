import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTrackerBuilder } from '@frameworks/rate-limiter';
import { DI } from '@di';
import { ConfigurationService } from '@services/ConfigurationService';

enum BybitTrackers {
  IP_COUNTER = 'ip-counter',
  UID_COUNTER = 'uid-counter',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

const DEFAULT_LIMITS = {
  [BybitTrackers.IP_COUNTER]: { '1S': 600 },
  [BybitTrackers.UID_COUNTER]: { '1S': 2 },
  websocket: { connect: { '5M': 500 }, send: { '1S': 5 } },
};

@injectable()
export class BybitRateLimiter extends BaseRateLimiter<ExchangeRequestContext.Bybit> {
  logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'BybitRateLimiter');

    const uidCounterLimits = this.mapIntervalLimits(DEFAULT_LIMITS[BybitTrackers.UID_COUNTER]);
    const ipCounterLimits = this.mapIntervalLimits(DEFAULT_LIMITS[BybitTrackers.IP_COUNTER]);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const uidTracker = RateLimitTrackerBuilder.create()
      .addEndpointTargetLayer()
      .addIdLayer(this.configuration.BYBIT_UID)
      .addIntervalLimits(uidCounterLimits)
      .useSlidingWindow()
      .build();
    this.addTracker(BybitTrackers.UID_COUNTER, uidTracker);

    const ipTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addIntervalLimits(ipCounterLimits)
      .useSlidingWindow()
      .build();
    this.addTracker(BybitTrackers.IP_COUNTER, ipTracker);

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect')
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BybitTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send')
      .addEndpointTargetLayer()
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(BybitTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }
}
