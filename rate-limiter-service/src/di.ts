import { Container, interfaces } from 'inversify';
import { ExchangeID } from '@entities';
import { RateLimiterModule } from '@modules';
import {
  BinanceRateLimiter,
  BybitRateLimiter,
  GateRateLimiter,
  KucoinRateLimiter,
  MexcRateLimiter,
  PoloniexRateLimiter,
} from '@adapters/module-rate-limiter';
import { ApplicationService, ConfigurationService, RateLimiterProvider } from '@services';
import { DI } from './di.config';

const applicationContainer = new Container({ skipBaseClassChecks: true });

/***************************************************************************
 * Shared Repositories
 ***************************************************************************/

applicationContainer
  .bind<ConfigurationService>(DI.ConfigurationService)
  .to(ConfigurationService)
  .inSingletonScope();

/***************************************************************************
 * Exchange Services
 ***************************************************************************/

applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(BinanceRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(BybitRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(GateRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(KucoinRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(MexcRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(PoloniexRateLimiter)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

applicationContainer
  .bind<interfaces.AutoNamedFactory<RateLimiterModule>>(DI.RateLimiterModuleFactory)
  .toAutoNamedFactory<RateLimiterModule>(DI.RateLimiterModule);

/***************************************************************************
 * Application Service
 ***************************************************************************/

applicationContainer
  .bind<RateLimiterProvider>(DI.RateLimiterProvider)
  .to(RateLimiterProvider)
  .inSingletonScope();

applicationContainer
  .bind<ApplicationService>(DI.ApplicationService)
  .to(ApplicationService)
  .inSingletonScope();

export { DI, applicationContainer };
