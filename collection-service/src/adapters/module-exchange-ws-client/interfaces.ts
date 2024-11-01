import { ExchangeID } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import {
  ExchangeClientModule,
  ExchangeMapperModule,
  ExchangeWebsocketModule,
  LoggerModule,
  RateLimiterModule,
} from '@modules';
import { ConfigurationService } from '@services/core';
import { WebsocketManager } from './base/WebsocketManager';
import { WebsocketRateLimiter } from './base/WebsocketRateLimiter';
import { WebsocketRequestManager } from './base/WebsocketRequestManager';
import { WebsocketSpecification } from './base/WebsocketSpecification';
import { WebsocketStreamManager } from './base/WebsocketStreamManager';

/**
 * ApplicationScope holds all core services that have a global scope and are used across different parts of the application.
 */
export interface ApplicationScope {
  configuration: ConfigurationService;
  database: DatabaseRepository;
  settings: SettingsRepository;
  rateLimiter: RateLimiterModule;
}

/**
 * ExchangeScope holds all specific exchange-related services and dependencies that have scope of the exchange lifetime.
 */
export interface ExchangeScope {
  id: ExchangeID;

  clientApi: ExchangeClientModule<any>;
  clientWs: ExchangeWebsocketModule;
  mapper: ExchangeMapperModule;
}

/**
 * WebsocketScope holds all websocket-client-related services and dependencies that have scope of the client itself.
 */
export interface WebsocketScope {
  connectionManager: WebsocketManager<any, any, any, any>;
  streamManager: WebsocketStreamManager<any, any, any, any>;
  requestManager: WebsocketRequestManager;
  rateLimiter: WebsocketRateLimiter;

  specification: WebsocketSpecification<any, any, any, any>;
  logger: LoggerModule;
}

export interface ApplicationScoped {
  application: ApplicationScope;
}
export interface ExchangeScoped extends ApplicationScoped {
  exchange: ExchangeScope;
}
export interface WebsocketScoped extends ExchangeScoped {
  websocket: WebsocketScope;
}
