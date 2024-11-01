import { Container, interfaces } from 'inversify';
import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import {
  ExchangeClientModule,
  ExchangeMapperModule,
  ExchangeProviderModule,
  ExchangeServiceModule,
  ExchangeWebsocketModule,
  HttpClientModule,
  RateLimiterModule,
} from '@modules';
import {
  BinanceApiClient,
  BybitApiClient,
  GateApiClient,
  KucoinApiClient,
  MexcApiClient,
  PoloniexApiClient,
} from '@adapters/module-exchange-client';
import {
  BinanceMapper,
  BybitMapper,
  GateMapper,
  KucoinMapper,
  MexcMapper,
  PoloniexMapper,
} from '@adapters/module-exchange-mapper';
import {
  BinanceProvider,
  BybitProvider,
  GateProvider,
  KucoinProvider,
  MexcProvider,
  PoloniexProvider,
} from '@adapters/module-exchange-provider';
import {
  BinanceWebsocketClient,
  BybitWebsocketClient,
  GateWebsocketClient,
  KucoinWebsocketClient,
  MexcWebsocketClient,
  PoloniexWebsocketClient,
} from '@adapters/module-exchange-ws-client';
import { AxiosHttpClient } from '@adapters/module-http-client';
import { CentralizedRateLimiter } from '@adapters/module-rate-limiter';
import { MongoDatabaseRepository } from '@adapters/repository-database';
import { MongoSettingsRepository } from '@adapters/repository-settings/MongoSettingsRepository';
import { ApplicationService } from '@services';
import { ControlController, ControlService, HealthController, HealthService } from '@services/api';
import { ConfigurationService, OrchestrationService } from '@services/core';
import {
  BinanceService,
  BybitService,
  GateService,
  KucoinService,
  MexcService,
  PoloniexService,
} from '@services/exchanges';
import {
  CmcClient,
  CmcService,
  HeartbeatClient,
  HeartbeatService,
  RegistryClient,
  RegistryService,
  TaskLogClient,
  TaskLogService,
} from '@services/remote';
import { DI } from './config';

const applicationContainer = new Container({ skipBaseClassChecks: true });

/***************************************************************************
 * Shared Repositories
 ***************************************************************************/

applicationContainer
  .bind<ConfigurationService>(DI.ConfigurationService)
  .to(ConfigurationService)
  .inSingletonScope();

applicationContainer
  .bind<DatabaseRepository>(DI.DatabaseRepository)
  .to(MongoDatabaseRepository)
  .inSingletonScope();
applicationContainer
  .bind<SettingsRepository>(DI.SettingsRepository)
  .to(MongoSettingsRepository)
  .inSingletonScope();

/***************************************************************************
 * Shared Modules
 ***************************************************************************/

applicationContainer.bind<HttpClientModule>(DI.HttpClientModule).to(AxiosHttpClient).inSingletonScope();
applicationContainer
  .bind<RateLimiterModule>(DI.RateLimiterModule)
  .to(CentralizedRateLimiter)
  .inSingletonScope();

/***************************************************************************
 * Remote Services
 ***************************************************************************/

applicationContainer.bind<CmcClient>(DI.CmcClient).to(CmcClient).inSingletonScope();
applicationContainer.bind<HeartbeatClient>(DI.HeartbeatClient).to(HeartbeatClient).inSingletonScope();
applicationContainer.bind<RegistryClient>(DI.RegistryClient).to(RegistryClient).inSingletonScope();
applicationContainer.bind<TaskLogClient>(DI.TaskLogClient).to(TaskLogClient).inSingletonScope();

applicationContainer.bind<CmcService>(DI.CmcService).to(CmcService).inSingletonScope();
applicationContainer.bind<HeartbeatService>(DI.HeartbeatService).to(HeartbeatService).inSingletonScope();
applicationContainer.bind<RegistryService>(DI.RegistryService).to(RegistryService).inSingletonScope();
applicationContainer.bind<TaskLogService>(DI.TaskLogService).to(TaskLogService).inSingletonScope();

/***************************************************************************
 * API Services
 ***************************************************************************/

applicationContainer.bind<HealthService>(DI.ApiHealthService).to(HealthService).inSingletonScope();
applicationContainer.bind<ControlService>(DI.ApiControlService).to(ControlService).inSingletonScope();

applicationContainer.bind<HealthController>(DI.ApiHealthController).to(HealthController).inSingletonScope();
applicationContainer
  .bind<ControlController>(DI.ApiControlController)
  .to(ControlController)
  .inSingletonScope();

/***************************************************************************
 * Core Services
 ***************************************************************************/

applicationContainer
  .bind<OrchestrationService>(DI.OrchestrationService)
  .to(OrchestrationService)
  .inSingletonScope();

/***************************************************************************
 * Exchange Modules
 ***************************************************************************/

// Exchange Client Modules
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(BinanceApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(BybitApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(GateApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(KucoinApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(MexcApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<ExchangeClientModule>(DI.ExchangeClientModule)
  .to(PoloniexApiClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

// Exchange Mapper Modules
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(BinanceMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(BybitMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(GateMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(KucoinMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(MexcMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<ExchangeMapperModule>(DI.ExchangeMapperModule)
  .to(PoloniexMapper)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

// Exchange Provider Modules
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(BinanceProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(BybitProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(GateProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(KucoinProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(MexcProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<ExchangeProviderModule>(DI.ExchangeProviderModule)
  .to(PoloniexProvider)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

// Exchange Websocket Modules
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(BinanceWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(BybitWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(GateWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(KucoinWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(MexcWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<ExchangeWebsocketModule>(DI.ExchangeWebsocketModule)
  .to(PoloniexWebsocketClient)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

/***************************************************************************
 * Exchange Services
 ***************************************************************************/

applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(BinanceService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Binance);
applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(BybitService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Bybit);
applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(GateService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Gate);
applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(KucoinService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Kucoin);
applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(MexcService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Mexc);
applicationContainer
  .bind<ExchangeServiceModule>(DI.ExchangeService)
  .to(PoloniexService)
  .inSingletonScope()
  .whenTargetNamed(ExchangeID.Poloniex);

applicationContainer
  .bind<interfaces.AutoNamedFactory<ExchangeServiceModule>>(DI.ExchangeFactoryService)
  .toAutoNamedFactory<ExchangeServiceModule>(DI.ExchangeService);

/***************************************************************************
 * Application Service
 ***************************************************************************/

applicationContainer
  .bind<ApplicationService>(DI.ApplicationService)
  .to(ApplicationService)
  .inSingletonScope();

export { DI, applicationContainer };
