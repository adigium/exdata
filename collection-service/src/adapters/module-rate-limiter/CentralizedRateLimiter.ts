import { inject, injectable } from 'inversify';
import { ExchangeID } from '@entities';
import { ExchangeRequestContextMap, HttpClientModule, LoggerModule, RateLimiterModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

@injectable()
export class CentralizedRateLimiter implements RateLimiterModule {
  private logger: LoggerModule;

  private host: string;
  private port: number | string | undefined;
  private tls: boolean | undefined;

  constructor(
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
    @inject(DI.HttpClientModule) private httpClient: HttpClientModule,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'CentralizedRateLimiter');

    this.host = configuration.RATE_LIMITER_HOST;
    this.port = configuration.RATE_LIMITER_PORT;
    this.tls = configuration.TLS_ENABLED === 'true';
  }

  async addUsage<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
  ): Promise<RateLimitInfo> {
    try {
      const {
        status,
        data: { exceeds, retryTime },
      } = await this.httpClient.post<
        { request: RequestDetails<ExchangeRequestContextMap[E]> },
        RateLimitInfo
      >({
        url: this.getEndpointUrl(`/${exchange}/usage`),
        body: { request: requestDetails },
      });

      if (status !== 200) return { exceeds: true, retryTime: 1000 };

      return { exceeds, retryTime };
    } catch (e: any) {
      this.logger.error(`Failed to add usage to ${requestDetails.endpoint}: ${e.message}`);
      return { exceeds: true, retryTime: 1000 };
    }
  }

  async getLimitInfo<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
  ): Promise<RateLimitInfo> {
    try {
      const { data, status } = await this.httpClient.post<
        { request: RequestDetails<ExchangeRequestContextMap[E]> },
        RateLimitInfo
      >({
        url: this.getEndpointUrl(`/${exchange}/limit`),
        body: { request: requestDetails },
      });

      if (status !== 200) return { exceeds: true, retryTime: 1000 };

      return data;
    } catch (e: any) {
      this.logger.error(`Failed to get limit info for ${requestDetails.endpoint}: ${e.message}`);
      return { exceeds: true, retryTime: 1000 };
    }
  }

  async waitForLimit(limit: RateLimitInfo): Promise<void> {
    if (!limit.exceeds) return;

    if (limit.retryTime > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, limit.retryTime);
      });
    } else {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
  }

  async updateLimits<E extends ExchangeID>(
    exchange: E,
    requestDetails: RequestDetails<ExchangeRequestContextMap[E]>,
    limits: Record<string, number>,
  ): Promise<void> {
    try {
      await this.httpClient.put<
        { request: RequestDetails<ExchangeRequestContextMap[E]>; limits: Record<string, number> },
        RateLimitInfo
      >({
        url: this.getEndpointUrl(`/${exchange}/limit`),
        body: { request: requestDetails, limits },
      });
    } catch (e: any) {
      this.logger.error(`Failed to update limits for ${exchange}: ${e.message}`);
    }
  }

  private getEndpointUrl(endpoint: string) {
    return endpoint.startsWith('/') ? `${this.getBaseUrl()}${endpoint}` : `${this.getBaseUrl()}/${endpoint}`;
  }

  private getBaseUrl() {
    return `${this.tls ? 'https' : 'http'}://${this.host}${this.port ? `:${this.port}` : ''}`;
  }
}
