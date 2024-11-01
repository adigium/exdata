import { inject, injectable } from 'inversify';
import { LoggerModule } from '@modules';
import { BaseRateLimiter } from '@adapters/module-rate-limiter/base/BaseRateLimiter';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { RateLimitTrackerBuilder } from '@frameworks/rate-limiter';
import { DI } from '@di';
import { ConfigurationService } from '@services/ConfigurationService';

enum MexcTrackers {
  IP_WEIGHT = 'ip-weight',
  UID_WEIGHT = 'uid-weight',
  WEBSOCKET_CONNECT = 'websocket-connect',
  WEBSOCKET_SEND = 'websocket-send',
}

const DEFAULT_LIMITS = {
  [MexcTrackers.IP_WEIGHT]: { '1M': 20000 },
  [MexcTrackers.UID_WEIGHT]: { '1M': 240000 },
  websocket: { connect: { '1S': 100 }, send: { '1S': 3 } },
};

@injectable()
export class MexcRateLimiter extends BaseRateLimiter<ExchangeRequestContext.Mexc> {
  logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService)
    private configuration: ConfigurationService,
  ) {
    super();

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'MexcRateLimiter');

    const weightIpLimits = this.mapIntervalLimits(DEFAULT_LIMITS[MexcTrackers.IP_WEIGHT]);
    const weightUidLimits = this.mapIntervalLimits(DEFAULT_LIMITS[MexcTrackers.UID_WEIGHT]);

    const websocketConnectLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.connect);
    const websocketSendLimits = this.mapIntervalLimits(DEFAULT_LIMITS.websocket.send);

    const weightIpTracker = RateLimitTrackerBuilder.create()
      .addIpLayer()
      .addIntervalLimits(weightIpLimits)
      .useFixedWindow()
      .build();
    this.addTracker(MexcTrackers.IP_WEIGHT, weightIpTracker);

    const weightUidTracker = RateLimitTrackerBuilder.create()
      .addIdLayer(this.configuration.MEXC_UID)
      .addIntervalLimits(weightUidLimits)
      .useFixedWindow()
      .build();
    this.addTracker(MexcTrackers.UID_WEIGHT, weightUidTracker);

    const websocketConnectTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addIpLayer()
      .addEndpointGroupLayer('wss://connect')
      .addIntervalLimits(websocketConnectLimits)
      .useFixedWindow()
      .build();
    this.addTracker(MexcTrackers.WEBSOCKET_CONNECT, websocketConnectTracker);

    const websocketSendTracker = RateLimitTrackerBuilder.create()
      .useCountType()
      .addEndpointGroupLayer('wss://send')
      .addEndpointTargetLayer()
      .addIntervalLimits(websocketSendLimits)
      .useFixedWindow()
      .build();
    this.addTracker(MexcTrackers.WEBSOCKET_SEND, websocketSendTracker);
  }
}
