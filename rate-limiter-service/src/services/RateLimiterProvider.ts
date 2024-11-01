import { inject, injectable, interfaces } from 'inversify';
import { ExchangeID } from '@entities';
import { RateLimiterModule } from '@modules';
import { DI } from '@di';

@injectable()
export class RateLimiterProvider {
  private rateLimiters: Map<ExchangeID, RateLimiterModule>;

  @inject(DI.RateLimiterModuleFactory)
  private rateLimiterFactory!: interfaces.AutoNamedFactory<RateLimiterModule>;

  constructor() {
    this.rateLimiters = new Map<ExchangeID, RateLimiterModule>();
  }

  public get(exchangeId: ExchangeID) {
    const instance = this.rateLimiters.get(exchangeId);

    if (instance) return instance;

    const newInstance = this.rateLimiterFactory(exchangeId);

    this.rateLimiters.set(exchangeId, newInstance);

    return newInstance;
  }
}
